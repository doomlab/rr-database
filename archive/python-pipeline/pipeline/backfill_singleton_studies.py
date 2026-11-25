"""One-off backfill: wrap every Paper not yet in a Study inside its own
singleton Study, so browsing/favoriting works today. The real linking pass
(matching Stage 1/2 papers via zoteroRelations into shared Studies) is
Phase 2+ work — this just gets every existing Paper a Study wrapper without
guessing at links that haven't been resolved yet. Future linking can merge
two singleton Studies together (move both StudyPaper rows onto one Study,
delete the other) without touching this backfill's output structure.

Usage:
    python pipeline/backfill_singleton_studies.py
"""

from db import get_connection

ROLE_BY_STAGE = {
    "STAGE_1": "STAGE1_ARTICLE",
    "STAGE_2": "STAGE2_ARTICLE",
}


def run():
    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute(
        'SELECT id, stage FROM "Paper" p '
        'WHERE NOT EXISTS (SELECT 1 FROM "StudyPaper" sp WHERE sp."paperId" = p.id)'
    )
    rows = cur.fetchall()

    for paper_id, stage in rows:
        role = ROLE_BY_STAGE.get(stage, "OTHER")
        cur.execute('INSERT INTO "Study" ("updatedAt") VALUES (NOW()) RETURNING id')
        study_id = cur.fetchone()[0]
        cur.execute(
            'INSERT INTO "StudyPaper" ("studyId", "paperId", role) VALUES (%s, %s, %s)',
            (study_id, paper_id, role),
        )

    conn.commit()
    cur.close()
    conn.close()
    print(f"Created {len(rows)} singleton studies")


if __name__ == "__main__":
    run()
