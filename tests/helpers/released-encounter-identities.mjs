// Identities changed by the approved #951 text update. Apply these to frozen
// test expectations only, and keep the original artwork and vectors intact.
const releasedIds=new Map([
 ['cultist','raven_adept'],['blue_slaver','blue_guard'],['red_slaver','red_guard'],
]);

export const currentEnemyId=id=>releasedIds.get(id)??id;

const releasedMoves=new Map([
 ['cultist/cultist_1','raven_adept_1'],['cultist/cultist_2','raven_adept_2'],
 ['blue_slaver/blue_slaver_1','blue_guard_1'],['blue_slaver/blue_slaver_2','blue_guard_2'],
 ['red_slaver/red_slaver_1','red_guard_1'],['red_slaver/red_slaver_2','red_guard_2'],
 ['red_slaver/red_slaver_3','red_guard_3'],
]);

export function currentEnemyIntentCase(row){
 const [enemy,move,intent]=row;
 const currentMove=releasedMoves.get(enemy+'/'+move);
 return currentMove?[currentEnemyId(enemy),currentMove,intent]:row;
}
