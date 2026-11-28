"""Plot an opt-in worker timeline. Requires matplotlib, not a runtime dependency."""
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator


def main():
    records = [json.loads(Path(path).read_text()) for path in sys.argv[2:]]
    if len(records) != 2:
        raise SystemExit("usage: plot-timeline.py OUTPUT.png COMMON.json ACT2.json")
    fig, axes = plt.subplots(2, 2, figsize=(16, 9), layout="constrained",
                             gridspec_kw={"height_ratios": [2.15, 1]})
    fig.suptitle("STH · Fengari Host memory lifecycle", x=.03, ha="left",
                 fontsize=21, fontweight="bold")
    for i, (report, title) in enumerate(zip(records, ["Core path · fresh VM", "Act II · fresh VM"])):
        top, bottom = axes[:, i]
        rows = report["phases"]
        phases = [r["phase"].removeprefix("act2-") for r in rows]
        index = range(len(rows))
        top.set_title(f"{title}\nNode {report['node']} · process peak {report['maxRssKiB']/1024:.0f} MiB",
                      loc="left", fontsize=13)
        for key, label, color in [("rss", "RSS at mark", "#0B5672"),
                                  ("heapTotal", "V8 heap committed", "#4D75C7"),
                                  ("heapUsed", "V8 heap used", "#D45B26")]:
            top.plot(index, [r[key] / (1024**2) for r in rows], "o-", label=label,
                     color=color, markersize=3, linewidth=2)
        top.set_ylabel("MiB (not additive)")
        top.legend(loc="lower right", frameon=False)
        top.set_xticks(index, ["" for _ in rows])
        top.grid(axis="y", alpha=.25)
        bottom.bar(index, [r["gcMs"] for r in rows], color="#6E5DC6", width=.66,
                   label="GC time in stage")
        bottom.set_ylabel("Natural GC (ms)")
        calls = bottom.twinx()
        calls.plot(index, [r["nativeCalls"] for r in rows], color="#A55219",
                   marker=".", label="Mock API calls")
        calls.set_ylabel("Mock API calls", color="#854317")
        calls.yaxis.set_major_locator(MaxNLocator(4))
        bottom.set_xticks(index, phases, rotation=48, ha="right", fontsize=9)
        for ax in (top, bottom):
            ax.set_xlim(-.45, len(rows)-.55)
            ax.spines[["top", "right"]].set_visible(False)
        bottom.set_xlabel("Existing worker checkpoints; spacing shows phase order, not elapsed time")
    fig.get_layout_engine().set(hspace=.05)
    fig.savefig(sys.argv[1], dpi=160)


if __name__ == "__main__":
    main()
