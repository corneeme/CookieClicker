import os
import re
import urllib.parse
import urllib.request

BASE_URL = "https://orteil.dashnet.org/cookieclicker/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/118.0.0.0"
}

# Core standalone JavaScript and static files
CORE_FILES = [
    "index.html",
    "style.css",
    "main.js",
    "minigameGarden.js",
    "minigamePantheon.js",
    "minigameGrimoire.js",
    "minigameMarket.js",
]

# Asset subdirectories to mirror completely
ASSET_DIRS = ["img/", "snd/", "loc/"]


def download_file(relative_path):
    """Downloads a single file if it's missing or updated."""
    url = urllib.parse.urljoin(BASE_URL, relative_path)
    local_path = os.path.join(".", relative_path.replace("/", os.sep))

    # Ensure parent folder exists
    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as response, open(
            local_path, "wb"
        ) as out_file:
            out_file.write(response.read())
            print(f" Synced: {relative_path}")
    except Exception as e:
        print(f" Failed to fetch {relative_path}: {e}")


def sync_directory(dir_name):
    """Parses index listings for assets (img, snd, loc) and downloads files."""
    print(f"\nScanning directory: {dir_name}...")
    url = urllib.parse.urljoin(BASE_URL, dir_name)
    req = urllib.request.Request(url, headers=HEADERS)

    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode("utf-8")

            # Extract links from Apache/Nginx directory listing
            files = re.findall(r'href="([^"?][^"]*)"', html)

            for file in files:
                # Ignore parent directory links and subfolders
                if file.startswith("/") or file.endswith("/") or "Parent Directory" in file:
                    continue

                download_file(f"{dir_name}{file}")
    except Exception as e:
        print(f"Could not read directory listing for {dir_name}: {e}")


def main():
    print("=== Cookie Clicker Sync Started ===")

    # 1. Download Core Code Files
    print("\nSyncing Core Logic & Files...")
    for file in CORE_FILES:
        download_file(file)

    # 2. Sync Media Subdirectories
    for d in ASSET_DIRS:
        sync_directory(d)

    print("\n Sync Complete! Run an HTTP server in this directory to play.")


if __name__ == "__main__":
    main()
