from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


ASSETS = Path("assets")
ASSETS.mkdir(exist_ok=True)

FILES = {
    "hero-house.jpg": "Modern-home-dusk (Creative Commons).jpg",
    "project-scandi.jpg": "Modern Timber House Germany.jpg",
    "project-fjord.jpg": "A beautiful, modern wooden house features large windows and fresh landscaping.jpg",
    "project-nord.jpg": "Robie House Exterior 19.jpg",
    "gallery-interior.jpg": "Modern wooden house interior (Unsplash).jpg",
    "gallery-facade.jpg": "Old Wooden House (48523620802).jpg",
    "gallery-terrace.jpg": "A charming wooden cottage features colorful flower boxes and sits amidst lush green fields, creating a peaceful retreat.jpg",
    "gallery-detail.jpg": "Wood lined interior of Tasmanian House III.jpg",
    "gallery-evening.jpg": "A warm, wooden cabin sits peacefully in a grassy area as the sun sets behind the trees.jpg",
    "about-team.jpg": "A person is kneeling beside wooden planters filled with plants near a cozy wooden cabin.jpg",
    "object-126.jpg": "A beautiful, modern wooden house features large windows and fresh landscaping.jpg",
    "object-94.jpg": "Modern Timber House Germany.jpg",
    "object-164.jpg": "Robie House Exterior 27.jpg",
}


def commons_url(filename):
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(filename)}?width=1600"

for filename, source_name in FILES.items():
    url = commons_url(source_name)
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=40) as response:
        data = response.read()
    target = ASSETS / filename
    target.write_bytes(data)
    print(filename, len(data))
