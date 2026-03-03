from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from backend.config import AT_DOMAINS
from backend.services.scanner import scan_titles

router = APIRouter()

# Topic definitions (mirrors frontend TOPICS)
TOPICS = {
    "medicine": ["Category:Medicine", "Category:Diseases and disorders", "Category:Medical treatments",
                 "Category:Drugs", "Category:Epidemiology", "Category:Pathology",
                 "Category:Medical specialties", "Category:Public health", "Category:Radiology",
                 "Category:Surgery", "Category:Pharmacology", "Category:Vaccines"],
    "biology": ["Category:Biology", "Category:Genetics", "Category:Molecular biology",
                "Category:Microbiology", "Category:Ecology", "Category:Botany", "Category:Zoology"],
    "physics": ["Category:Physics", "Category:Quantum mechanics", "Category:Astrophysics",
                "Category:Particle physics", "Category:Nuclear physics"],
    "chemistry": ["Category:Chemistry", "Category:Chemical elements", "Category:Organic chemistry",
                  "Category:Biochemistry", "Category:Chemical compounds"],
    "cs": ["Category:Computer science", "Category:Artificial intelligence", "Category:Machine learning",
           "Category:Programming languages", "Category:Cryptography", "Category:Software", "Category:Algorithms"],
    "history": ["Category:History", "Category:Ancient history", "Category:Medieval history",
                "Category:Modern history", "Category:World War II", "Category:World War I",
                "Category:History of science", "Category:Historiography"],
    "politics": ["Category:Politics", "Category:Elections", "Category:Political parties",
                 "Category:Heads of state", "Category:International relations", "Category:Diplomacy"],
    "geography": ["Category:Geography", "Category:Countries", "Category:Cities",
                  "Category:Islands", "Category:Rivers", "Category:Mountains"],
    "law": ["Category:Law", "Category:Criminal law", "Category:International law",
            "Category:Human rights", "Category:Supreme Court of the United States"],
    "economics": ["Category:Economics", "Category:Macroeconomics", "Category:Microeconomics",
                  "Category:Finance", "Category:Monetary policy", "Category:International trade"],
    "engineering": ["Category:Engineering", "Category:Electrical engineering", "Category:Civil engineering",
                    "Category:Mechanical engineering", "Category:Aerospace engineering"],
    "media": ["Category:Mass media", "Category:Journalism", "Category:Newspapers",
              "Category:Television", "Category:Radio", "Category:Podcasts"],
    "environment": ["Category:Environmentalism", "Category:Climate change", "Category:Pollution",
                    "Category:Conservation", "Category:Renewable energy", "Category:Sustainability"],
    "education": ["Category:Education", "Category:Universities and colleges", "Category:Schools",
                  "Category:Educational technology", "Category:Academic disciplines"],
    "sports": ["Category:Sports", "Category:Olympic Games", "Category:Football",
               "Category:Cricket", "Category:Basketball", "Category:Tennis"],
}


@router.get("/article")
async def scan_article(title: str = Query(...), check_refs: bool = Query(False), request: Request = None):
    async def generate():
        async for event in scan_titles([title], check_refs=check_refs):
            if await request.is_disconnected():
                break
            yield event

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/category")
async def scan_category(cat: str = Query(...), limit: int = Query(500, le=500), check_refs: bool = Query(False), request: Request = None):
    from backend.routers.wiki import category_members as _get_members

    members = await _get_members(cat=cat, limit=limit)
    titles = members["titles"]

    async def generate():
        async for event in scan_titles(titles, check_refs=check_refs):
            if await request.is_disconnected():
                break
            yield event

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/topic")
async def scan_topic(topic_id: str = Query(...), limit: int = Query(500, le=500), check_refs: bool = Query(False), request: Request = None):
    cats = TOPICS.get(topic_id, [])
    if not cats:
        from backend.sse import sse_event

        async def err():
            yield sse_event("error", {"message": f"Unknown topic: {topic_id}"})

        return StreamingResponse(err(), media_type="text/event-stream")

    # Gather articles from all categories
    from backend.routers.wiki import category_members as _get_members

    all_titles: list[str] = []
    seen: set[str] = set()
    for cat in cats:
        if len(all_titles) >= limit:
            break
        members = await _get_members(cat=cat, limit=limit - len(all_titles))
        for t in members["titles"]:
            if t not in seen:
                seen.add(t)
                all_titles.append(t)

    async def generate():
        async for event in scan_titles(all_titles[:limit], check_refs=check_refs):
            if await request.is_disconnected():
                break
            yield event

    return StreamingResponse(generate(), media_type="text/event-stream")
