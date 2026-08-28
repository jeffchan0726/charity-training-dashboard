# Download Tailwind CLI + Chart.js + SheetJS + Font Awesome for local/offline use.
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "recomp-offline-vendor/1.0"}


def fetch(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print("GET", url)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as res, open(dest, "wb") as out:
        out.write(res.read())
    print(" ", os.path.getsize(dest), "bytes ->", os.path.relpath(dest, ROOT))


def main():
    files = {
        os.path.join(ROOT, "tools", "tailwindcss.exe"):
            "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-windows-x64.exe",
        os.path.join(ROOT, "lib", "chart.umd.min.js"):
            "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
        os.path.join(ROOT, "lib", "xlsx.full.min.js"):
            "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
        os.path.join(ROOT, "lib", "fontawesome", "css", "all.min.css"):
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
        os.path.join(ROOT, "lib", "fontawesome", "webfonts", "fa-solid-900.woff2"):
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2",
        os.path.join(ROOT, "lib", "fontawesome", "webfonts", "fa-regular-400.woff2"):
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2",
        os.path.join(ROOT, "lib", "fontawesome", "webfonts", "fa-brands-400.woff2"):
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2",
        os.path.join(ROOT, "lib", "fontawesome", "webfonts", "fa-v4compatibility.woff2"):
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-v4compatibility.woff2",
    }
    for dest, url in files.items():
        fetch(url, dest)


if __name__ == "__main__":
    main()
