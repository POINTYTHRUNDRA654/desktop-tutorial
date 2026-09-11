"""
perk_flowchart.py -- reusable generator for the "form trace" flowchart page.

Grew out of the Demolition Expert / grenade-trajectory investigation
(2026-09-08): once a perk chain (or any form-reference chain) has been
dumped and verified with MossyDumpRecord.pas in xEdit, this turns the
verified data into the same Pip-Boy-styled Mermaid flowchart artifact,
instead of hand-writing HTML each time.

This is a TEMPLATE/GENERATOR, not a live xEdit integration -- it takes a
plain Python description of the chain (you fill this in from the xEdit
dump output, or a future automated parser of MossyDumpRecord_output.txt
fills it in) and renders the HTML. Wiring an automatic
MossyDumpRecord_output.txt -> RankEntry parser is a natural next step but
is intentionally NOT done here -- the output format of that script may
still change, and a hand-verified chain should go through a human read of
the dump at least once before it's trusted as a "verified" case study.

Usage:
    from perk_flowchart import Effect, Rank, render_chain_page

    chain = [
        Rank(name="DemolitionExpert01", form_id="0004C923", level=0, effects=[
            Effect("Mod Player Explosion Damage", "Multiply Value", "×1.25",
                   condition="HasPerk(Rank2) == false", native=False),
        ]),
        Rank(name="DemolitionExpert02", form_id="0004C924", level=10, effects=[
            Effect("Mod Player Explosion Damage", "Multiply Value", "×1.5",
                   condition="HasPerk(Rank3) == false", native=False),
            Effect("Show Grenade Trajectory", "Set Value", "1.0",
                   condition=None, native=True),
        ]),
    ]
    html = render_chain_page(
        title="Demolition Expert -- Form Trace",
        subject="Demolition Expert",
        source_file="Fallout4.esm",
        tool="FO4Edit 4.1.5f / MossyDumpRecord.pas",
        chain=chain,
        verdict_title="THERE IS NO SCRIPT TO EDIT",
        verdict_body=["...", "..."],
        dump_path=r"E:\Tools\FO4xEdit 4.1.5q\Edit Scripts\MossyDumpRecord_output.txt",
    )
    open("trace.html", "w", encoding="utf-8").write(html)

Then hand the .html to Mossy's normal "persist as artifact" / file-delivery
path -- this module only produces the file, it does not publish it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from html import escape


@dataclass
class Effect:
    entry_point: str
    function: str
    value: str
    condition: str | None = None
    native: bool = False  # True = zero Perk Conditions attached, i.e. unconditional engine behavior


@dataclass
class Rank:
    name: str
    form_id: str
    level: int
    effects: list[Effect] = field(default_factory=list)


def _mermaid_id(name: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in name)


def _build_mermaid(chain: list[Rank]) -> str:
    lines = ["flowchart TD"]
    for i, rank in enumerate(chain):
        rid = _mermaid_id(rank.name)
        lines.append(f'    {rid}["{rank.name}\\n[PERK:{rank.form_id}]\\nLevel {rank.level}"]')
        if i > 0:
            prev_rid = _mermaid_id(chain[i - 1].name)
            lines.append(f"    {prev_rid} -- NNAM Next Perk --> {rid}")
        for j, eff in enumerate(rank.effects):
            eid = f"{rid}_E{j}"
            label = f"{eff.entry_point}\\n{eff.function} {eff.value}"
            lines.append(f'    {rid} --> {eid}["{label}"]')
            if eff.condition:
                cid = f"{eid}_C"
                lines.append(f'    {cid}{{{{"Perk Condition:\\n{eff.condition}"}}}}')
                lines.append(f"    {eid} --- {cid}")

    perk_ids = [_mermaid_id(r.name) for r in chain]
    effect_ids, native_ids = [], []
    for rank in chain:
        rid = _mermaid_id(rank.name)
        for j, eff in enumerate(rank.effects):
            (native_ids if eff.native else effect_ids).append(f"{rid}_E{j}")

    lines += [
        "    classDef perk fill:#0d140e,stroke:#2f7a44,color:#4df08a,font-family:IBM Plex Mono,font-size:12px;",
        "    classDef effect fill:#0d140e,stroke:#1f4a2b,color:#9fd6ae,font-family:IBM Plex Mono,font-size:11px;",
        "    classDef native fill:#1a1204,stroke:#ffb238,color:#ffb238,font-family:IBM Plex Mono,font-size:11px;",
        "    classDef cond fill:#0a0f0a,stroke:#1f4a2b,color:#7fae86,font-family:IBM Plex Mono,font-size:10px;",
    ]
    if perk_ids:
        lines.append(f"    class {','.join(perk_ids)} perk;")
    if effect_ids:
        lines.append(f"    class {','.join(effect_ids)} effect;")
    if native_ids:
        lines.append(f"    class {','.join(native_ids)} native;")
    return "\n".join(lines)


def _rank_card(rank: Rank, hot: bool) -> str:
    effs = []
    for eff in rank.effects:
        cls = "effect native" if eff.native else "effect"
        tag = (
            '<div class="tag" style="color:var(--amber)">no condition · native</div>'
            if eff.native
            else (f'<div class="tag" style="color:var(--green-dim)">{escape(eff.condition)}</div>' if eff.condition else "")
        )
        effs.append(
            f'<div class="{cls}"><b>{escape(eff.entry_point)}</b><br>{escape(eff.function)} → {escape(eff.value)}{tag}</div>'
        )
    card_cls = "rank-card hot" if hot else "rank-card"
    return (
        f'<div class="{card_cls}"><div class="rank-head"><span>{escape(rank.name)}</span>'
        f'<span class="lvl">LEVEL {rank.level}</span></div>{"".join(effs)}</div>'
    )


_PAGE_TEMPLATE = """<title>{title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=VT323&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
  :root{{
    --bg:#070b08; --panel:#0d140e; --line:#1f4a2b; --line-bright:#2f7a44;
    --green:#4df08a; --green-dim:#7fae86; --amber:#ffb238; --amber-dim:#7a5c22;
    --font-display:'VT323','Courier New',monospace; --font-body:'IBM Plex Mono','Courier New',monospace;
  }}
  *{{box-sizing:border-box;}}
  body{{margin:0;background:radial-gradient(ellipse at top,#0c150d 0%,var(--bg) 55%);
    color:var(--green);font-family:var(--font-body);padding:28px 16px 64px;-webkit-font-smoothing:antialiased;}}
  .wrap{{max-width:960px;margin:0 auto;}}
  header{{border:1px solid var(--line-bright);padding:18px 22px;margin-bottom:22px;position:relative;
    background:linear-gradient(180deg,rgba(79,240,138,0.06),transparent 60%);}}
  header::before{{content:"MOSSY // FORM TRACE UTILITY";position:absolute;top:-11px;left:16px;background:var(--bg);
    padding:0 8px;font-size:11px;letter-spacing:0.14em;color:var(--green-dim);}}
  h1{{font-family:var(--font-display);font-size:44px;line-height:1;margin:6px 0 4px;text-wrap:balance;
    text-shadow:0 0 14px rgba(79,240,138,0.35);}}
  .subtitle{{color:var(--green-dim);font-size:13px;margin:0;}}
  .meta-row{{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:14px;font-size:12px;color:var(--green-dim);}}
  .meta-row b{{color:var(--green);font-weight:600;}}
  section{{margin-bottom:26px;}}
  .section-label{{font-family:var(--font-display);font-size:21px;color:var(--amber);
    border-bottom:1px solid var(--line);padding-bottom:6px;margin:0 0 14px;}}
  .diagram-panel{{border:1px solid var(--line);background:var(--panel);padding:18px;overflow-x:auto;}}
  .rank-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1px;
    background:var(--line);border:1px solid var(--line);}}
  .rank-card{{background:var(--panel);padding:14px 16px;display:flex;flex-direction:column;gap:8px;}}
  .rank-card.hot{{background:linear-gradient(180deg,rgba(255,178,56,0.10),var(--panel) 70%);}}
  .rank-head{{display:flex;justify-content:space-between;align-items:baseline;
    font-family:var(--font-display);font-size:20px;color:var(--green);}}
  .rank-head .lvl{{font-size:11px;font-family:var(--font-body);color:var(--green-dim);}}
  .effect{{font-size:12px;line-height:1.5;color:var(--green-dim);border-left:2px solid var(--line-bright);padding-left:9px;}}
  .effect b{{color:var(--green);font-weight:600;}}
  .effect.native{{border-left-color:var(--amber);}}
  .effect.native b{{color:var(--amber);}}
  .tag{{display:inline-block;font-size:9.5px;letter-spacing:0.06em;padding:1px 6px;border:1px solid currentColor;
    border-radius:2px;margin-top:2px;}}
  .verdict{{border:1px solid var(--amber-dim);background:linear-gradient(180deg,rgba(255,178,56,0.07),transparent);
    padding:18px 20px;}}
  .verdict .vlabel{{font-family:var(--font-display);font-size:19px;color:var(--amber);margin:0 0 8px;}}
  .verdict p{{margin:0 0 10px;font-size:13px;line-height:1.65;color:#d9ead9;}}
  .path{{font-size:11.5px;color:var(--green-dim);background:#04120a;border:1px solid var(--line);
    padding:8px 10px;margin-top:6px;word-break:break-all;line-height:1.6;}}
  footer{{margin-top:30px;font-size:10.5px;color:var(--green-dim);border-top:1px solid var(--line);padding-top:12px;}}
</style>
<div class="wrap">
  <header>
    <h1>{title}</h1>
    <p class="subtitle">Traced record-by-record in xEdit — every value read from live game data, nothing inferred from memory</p>
    <div class="meta-row">
      <span>SOURCE&nbsp;<b>{source_file}</b></span>
      <span>TOOL&nbsp;<b>{tool}</b></span>
      <span>RECORDS&nbsp;<b>{n_records} chained</b></span>
    </div>
  </header>
  <section>
    <p class="section-label">01 // Reference Chain</p>
    <div class="diagram-panel"><pre class="mermaid">
{mermaid}
</pre></div>
  </section>
  <section>
    <p class="section-label">02 // Rank-by-Rank Effects</p>
    <div class="rank-grid">{rank_cards}</div>
  </section>
  <section>
    <p class="section-label">03 // Verdict</p>
    <div class="verdict">
      <p class="vlabel">▸ {verdict_title}</p>
      {verdict_paragraphs}
      <div class="path">{dump_path}</div>
    </div>
  </section>
  <footer>Generated by perk_flowchart.py from a verified xEdit MossyDumpRecord.pas trace</footer>
</div>
"""


def render_chain_page(
    *,
    title: str,
    subject: str,
    source_file: str,
    tool: str,
    chain: list[Rank],
    verdict_title: str,
    verdict_body: list[str],
    dump_path: str,
    hot_rank_index: int | None = None,
) -> str:
    """Render the full HTML page for a verified form/perk reference chain."""
    mermaid = _build_mermaid(chain)
    rank_cards = "".join(
        _rank_card(r, hot=(hot_rank_index is not None and i == hot_rank_index))
        for i, r in enumerate(chain)
    )
    verdict_paragraphs = "".join(f"<p>{escape(p)}</p>" for p in verdict_body)
    return _PAGE_TEMPLATE.format(
        title=escape(title),
        source_file=escape(source_file),
        tool=escape(tool),
        n_records=len(chain),
        mermaid=mermaid,
        rank_cards=rank_cards,
        verdict_title=escape(verdict_title),
        verdict_paragraphs=verdict_paragraphs,
        dump_path=escape(dump_path),
    )
