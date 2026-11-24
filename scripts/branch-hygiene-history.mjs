import { isProduction } from './check-pr-slice.mjs';
import { backlogDeclaration, changedBacklogTasks, changedCompletedBacklogTasks, mentionedTasks } from './backlog-closeout.mjs';

const visible = body => (body ?? '').replace(/<!--[^]*?(?:-->|$)/g, '');
const withoutReceipts = body => visible(body).replace(/^CLOSEOUT:.*$/gm, '');
const pullLink = /https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)\b/gi;
const unique = values => [...new Set(values)];
const releaseBase = pr => pr.base.ref.startsWith('release/');
const isMaintainer = comment => ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(comment.author_association);

function references(source, repo, shorthand = true) {
  const body = visible(source);
  const links = [...body.matchAll(pullLink)]
    .filter(match => match[1].toLowerCase() === repo.toLowerCase()).map(match => Number(match[2]));
  const local = shorthand ? [...body.matchAll(/(?<![\w/&#])#\d+\b(?:\/#\d+\b)*/g)]
    .flatMap(match => match[0].split('/').map(number => Number(number.slice(1)))) : [];
  return unique([...links, ...local]);
}

function handoffReferences(body, repo) {
  return unique(withoutReceipts(body).split(/\r?\n/)
    .filter(line => /继任|接续|承接|接回|回迁|回流|已拆到|提取|supersed|inherit|backport|successor|remaining candidate/i.test(line))
    .flatMap(line => references(line, repo)));
}

function readReceipts(source) {
  return visible(source).split(/\r?\n/).flatMap(line => {
    const match = /^CLOSEOUT: (\S+)@([a-f0-9]{40}) \| (.+)$/.exec(line);
    if (!match) return [];
    const fields = Object.fromEntries(match[3].split(' | ').filter(field => field.includes('='))
      .map(field => [field.slice(0, field.indexOf('=')), field.slice(field.indexOf('=') + 1)]));
    const number = Number(/^#(\d+)$/.exec(fields.PR)?.[1]);
    if (!number || !fields['version/base'] || !fields.evidence || !fields.owner || !fields.remote ||
        !['DELIVERED_VERIFIED', 'SUPERSEDED', 'FROZEN', 'DISCARDED', 'BLOCKED'].includes(fields.outcome)) return [];
    return [{ ...fields, number, branch: match[1], head: match[2] }];
  });
}

function sameDevelopContent(file, developTree) {
  if (file.status === 'removed') return !developTree.has(file.filename);
  return developTree.get(file.filename) === file.sha &&
    (file.status !== 'renamed' || !developTree.has(file.previous_filename));
}

export async function auditHistory({ repo, branches, prs, comments, tasks, developTree, loadFiles }) {
  const branchByName = new Map(branches.map(branch => [branch.name, branch.commit.sha]));
  const sources = prs.filter(pr => pr.state === 'closed' && (!pr.merged_at || releaseBase(pr)));
  const sourceIds = new Set(sources.map(pr => pr.number));
  const developByNumber = new Map(prs.filter(pr => pr.base.ref === 'develop').map(pr => [pr.number, pr]));
  const notes = new Map(), incoming = new Map(), backlog = new Map(), backlogReceipts = new Map();
  function add(index, key, value) {
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(value);
  }
  for (const comment of comments) {
    const number = Number(comment.issue_url.split('/').at(-1));
    if (sourceIds.has(number) && isMaintainer(comment)) add(notes, number, comment.body);
  }
  for (const pr of developByNumber.values()) {
    for (const source of handoffReferences(pr.body, repo)) if (sourceIds.has(source)) add(incoming, source, pr.number);
  }
  for (const task of tasks.filter(task => !task.metadataErrors?.length)) {
    const receipts = readReceipts(task.source);
    for (const receipt of receipts) add(backlogReceipts, receipt.number, receipt);
    for (const number of unique([...references(task.source, repo, false), ...receipts.map(receipt => receipt.number)])) {
      add(backlog, number, task.id);
    }
  }
  const taskById = new Map(tasks.filter(task => !task.metadataErrors?.length).map(task => [task.id, task]));
  const filesByNumber = new Map();
  function files(number) {
    if (!filesByNumber.has(number)) {
      filesByNumber.set(number, loadFiles(number).then(rows => ({
        rows: rows.filter(file => isProduction(file.filename) || isProduction(file.previous_filename ?? ''))
      })).catch(error => ({ error: error.message })));
    }
    return filesByNumber.get(number);
  }

  const results = await Promise.all(sources.map(async pr => {
    const text = [visible(pr.body), ...(notes.get(pr.number) ?? [])].join('\n');
    const receipts = [...readReceipts(text), ...(backlogReceipts.get(pr.number) ?? [])]
      .filter(receipt => receipt.number === pr.number && receipt.head === pr.head.sha && receipt.branch === pr.head.ref);
    const successorNumbers = unique([...handoffReferences(text, repo), ...(incoming.get(pr.number) ?? []),
      ...receipts.flatMap(receipt => references(receipt.successor, repo))])
      .filter(number => number !== pr.number && developByNumber.has(number)).sort((a, b) => a - b);
    const successors = successorNumbers.map(number => developByNumber.get(number));
    const merged = successors.filter(candidate => candidate.merged_at && candidate.merge_commit_sha);
    const taskIds = unique([...(backlog.get(pr.number) ?? []), ...(visible(text).match(/\bTASK-\d+(?:\.\d+)*\b/g) ?? [])]);
    const taskLinks = taskIds.map(id => {
      const task = taskById.get(id);
      return { id, status: task?.status ?? null, remaining_ac: task ? task.acCount - task.acCompleted : null };
    });

    const releaseMerged = Boolean(pr.merged_at);
    const source = releaseMerged || merged.length ? await files(pr.number) : {};
    const linked = source.rows?.length && merged.length ? await Promise.all(merged.map(candidate => files(candidate.number))) : [];
    const linkedPaths = new Set(linked.flatMap(result => result.rows?.flatMap(file =>
      [file.filename, file.previous_filename].filter(Boolean)) ?? []));
    const overlaps = file => linkedPaths.has(file.filename) || linkedPaths.has(file.previous_filename);
    const exact = file => developTree && sameDevelopContent(file, developTree);
    const unverified = developTree ? source.rows?.filter(file => !exact(file)).map(file => file.filename) : null;
    const overlap = source.rows?.filter(overlaps).map(file => file.filename);
    const uncovered = source.rows?.filter(file => !exact(file) && !overlaps(file)).map(file => file.filename);
    const errors = [source.error, ...linked.map(result => result.error)].filter(Boolean);
    const review = [];
    if (!releaseMerged && !receipts.length) review.push('closeout-receipt-missing');
    if (receipts.some(receipt => receipt.outcome === 'BLOCKED')) review.push('closeout-blocked');
    if (!releaseMerged && receipts.some(receipt => receipt.outcome === 'DELIVERED_VERIFIED' &&
        !references(receipt.successor, repo).some(number => merged.some(candidate => candidate.number === number)))) {
      review.push('delivered-successor-unverified');
    }
    if (receipts.some(receipt => receipt.outcome === 'SUPERSEDED' && !receipt.remaining)) review.push('remaining-scope-missing');
    if (receipts.some(receipt => receipt.outcome === 'SUPERSEDED' &&
        !references(receipt.successor, repo).some(number => number !== pr.number && developByNumber.has(number)))) {
      review.push('successor-unresolved');
    }
    if (receipts.some(receipt => receipt.remaining && receipt.remaining !== 'none')) review.push('remaining-scope-recorded');
    if (successors.some(candidate => !candidate.merged_at)) review.push('linked-develop-pr-unmerged');
    if (merged.length && unverified?.length) {
      review.push(overlap.length && uncovered.length ? 'partial-successor-paths' : 'successor-content-unverified');
    }
    if (releaseMerged && unverified?.length) review.push('release-backflow-review');
    if (errors.length || source.rows?.length && !developTree) review.push('file-comparison-unavailable');

    const remoteSha = branchByName.get(pr.head.ref);
    const headRepo = pr.head.repo?.full_name;
    return {
      pr: pr.number, title: pr.title, base: pr.base.ref, closed_at: pr.closed_at,
      head: pr.head.sha, head_branch: pr.head.ref, head_repository: headRepo ?? null,
      head_state: !headRepo ? 'repository-unavailable' : headRepo.toLowerCase() !== repo.toLowerCase() ? 'fork'
        : !remoteSha ? 'branch-absent' : remoteSha === pr.head.sha ? 'same-head' : 'branch-moved',
      release_merge: releaseMerged ? pr.merge_commit_sha : null,
      receipts, backlog: taskLinks, linked_develop_prs: successors.map(candidate => ({ pr: candidate.number,
        state: candidate.state, merge_sha: candidate.merged_at ? candidate.merge_commit_sha : null })),
      production_paths: source.rows?.length ?? null, different_develop_paths: unverified ?? null,
      linked_develop_paths: overlap ?? null, uncovered_paths: uncovered ?? null, errors, review
    };
  }));
  return results.sort((a, b) => b.pr - a.pr);
}

export async function auditBacklogDelivery({prs, tasks, loadFiles}) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const merged = prs.filter(pr => pr.state === 'closed' && pr.merged_at && pr.base.ref === 'develop' &&
    /^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? ''));
  const rows = await Promise.all(merged.map(async pr => {
    const sha = pr.merge_commit_sha;
    let changed, completed;
    try {
      const files = await loadFiles(pr.number);
      if (Number.isInteger(pr.changed_files) && files.length !== pr.changed_files) throw Error('Incomplete PR file list');
      changed = changedBacklogTasks(files);
      completed = changedCompletedBacklogTasks(files);
    } catch (error) {
      return {pr:pr.number, merge_sha:sha, task_ids:[], drift:[error.message]};
    }
    const { actions, errors } = backlogDeclaration(pr.body, changed, mentionedTasks(pr.title));
    const historicalLinks = tasks.filter(task =>
      task.source.includes(pr.html_url ?? 'https://invalid.example/no-link')).map(task => task.id);
    const scopedIds = [...new Set([...actions.keys(), ...changed, ...mentionedTasks(pr.title), ...historicalLinks])];
    const drift = [...errors];
    const taskStatus = scopedIds.map(id => {
      const task = byId.get(id), action = actions.get(id);
      const marker = `[delivery:${sha}] ${action} PR #${pr.number}; remaining AC:`;
      const committedDone = action === 'done' && task?.location === 'completed' && task.status === 'Done' &&
        task.acCount > 0 && task.acCount === task.acCompleted && completed.includes(id);
      const receipt = task && !task.metadataErrors?.length &&
        (action === 'recorded' ? changed.includes(id) : committedDone || task.source.split(/\r?\n/).some(line => line.startsWith(marker)));
      if (!receipt) drift.push(`${id}: merged delivery receipt missing`);
      return {id, disposition:action ?? null, status:task?.status ?? null,
        remaining_ac:task ? task.acCount - task.acCompleted : null, receipt:Boolean(receipt)};
    });
    return {pr:pr.number, merge_sha:sha, task_ids:scopedIds, tasks:taskStatus, drift};
  }));
  return rows.filter(row => row.drift.length).sort((a,b) => b.pr - a.pr);
}
