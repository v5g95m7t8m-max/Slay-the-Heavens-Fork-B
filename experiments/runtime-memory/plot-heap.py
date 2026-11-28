"""Render measured V8 snapshot analysis; never use snapshot overhead as RSS."""
import re
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle


def tile(figure, rows, x, y, w, h, colors):
    if len(rows) == 1:
        name, size = rows[0]
        figure.add_patch(Rectangle((x, y), w, h, facecolor=colors[name],
                                   edgecolor="#ffffff", linewidth=2))
        if w * h >= .02:
            figure.text(x + w/2, y + h/2, f"{name}\n{size/2**20:.1f} MiB",
                        color="#ffffff", ha="center", va="center",
                        fontsize=13 if w * h >= .08 else 9, fontweight="bold")
        return
    total = sum(size for _, size in rows)
    cut = min(range(1, len(rows)), key=lambda i: abs(total/2 - sum(v for _, v in rows[:i])))
    share = sum(v for _, v in rows[:cut]) / total
    if w * 2 > h:
        tile(figure, rows[:cut], x, y, w*share, h, colors)
        tile(figure, rows[cut:], x+w*share, y, w*(1-share), h, colors)
    else:
        tile(figure, rows[:cut], x, y, w, h*share, colors)
        tile(figure, rows[cut:], x, y+h*share, w, h*(1-share), colors)


def main():
    report, destination = map(Path, sys.argv[1:])
    lines = report.read_text().splitlines()
    total = int(re.search(r"sum_reachable_self=(\d+)", lines[0]).group(1))
    kinds = {}
    for line in lines:
        if match := re.match(r"^SHALLOW (\d+) \d+ \d+ ?(.*)", line):
            size, name = match.groups()
            kinds[name] = int(size)
    assert total and kinds["TValue"] and kinds["Table"]
    rows = [(k, kinds[k]) for k in ["Object", "TValue", "Table", "Map", "Uint8Array", "ArrayBuffer"]]
    backing = sum(kinds.get(k, 0) for k in ["", "(object elements)"])
    rows += [("Backing storage¹", backing), ("Other", total - backing - sum(v for _, v in rows))]
    assert rows[-1][1] > 0
    rows.sort(key=lambda row: row[1], reverse=True)
    colors = dict(zip([k for k, _ in rows],
                      ["#115571", "#236492", "#56519B", "#7D4F8A",
                       "#376862", "#9F5432", "#775534", "#5D6068"]))
    fig, ax = plt.subplots(figsize=(13.5, 7))
    fig.subplots_adjust(left=.045, right=.96, bottom=.14, top=.82)
    fig.text(.045,.93,"STH · V8 cold Host heap composition",fontsize=23,fontweight="bold")
    fig.text(.045,.876,f"{total/2**20:.1f} MiB reachable shallow bytes · develop 32a15219 · short mock Host (not production workload)",fontsize=12)
    tile(ax, rows, 0, 0, 1, 1, colors)
    ax.set_axis_off()
    fig.text(.045,.073,"¹ Anonymous V8 array backing and object elements. Generic objects are not attributed to game subsystems.",fontsize=10)
    fig.text(.045,.047,"Disjoint shallow categories; excludes process overhead and does not represent client RSS or repeated-reentry retention.",fontsize=10)
    fig.savefig(destination / "heap-composition.png", dpi=160)
    plt.close(fig)

    # The measured strong path (not inferred from source). Omit only the
    # anonymous backing node for readability; the raw output preserves it.
    target = re.search(r"^STRONG_PATH (@\d+) Table <- .*?stack (@\d+):lua_State", "\n".join(lines), re.M)
    assert target
    owner, state = target.groups()
    retained = int(re.search(r"^DOM " + owner + r" retained=(\d+)", "\n".join(lines), re.M).group(1))
    fig, ax = plt.subplots(figsize=(13.5, 6))
    ax.set(xlim=(0, 1), ylim=(0, 1))
    ax.set_axis_off()
    ax.set_title("STH · Measured strong retaining path", loc="left", fontsize=22, fontweight="bold", pad=24)
    stages = ["V8 stack roots", f"lua_State {state}", "stack → TValue.value",
              "Lua Table.strong → Map", "Map entry → TValue.value",
              f"Lua Table {owner}\n{retained/2**20:.1f} MiB dominated"]
    for i, label in enumerate(stages):
        y = .88-i*.145
        ax.text(.5,y,label,ha="center",va="center",fontsize=12,color="#ffffff",
                bbox=dict(boxstyle="round,pad=.5",facecolor="#115571" if i == 5 else "#28628D",edgecolor="none"))
        if i:
            ax.annotate("",xy=(.5,y+.043),xytext=(.5,y+.11),arrowprops=dict(arrowstyle="->",color="#687786"))
    fig.text(.08,.061,"Cold worker stack still executing Lua. This path does not establish post-exit retention or a device leak.",fontsize=11)
    fig.savefig(destination / "heap-retaining-path.png", dpi=160)


if __name__ == "__main__":
    main()
