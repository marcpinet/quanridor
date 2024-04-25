import os
import sys
import re
import subprocess
import shutil

def replace_in_file(file_path, search_replace_pairs):
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
        for search, replace in search_replace_pairs:
            content = re.sub(search, replace, content)
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content)

def process_files(root_dir, website_url):
    search_replace_pairs = [
        (re.compile(fr'const permanent_socket = io\("({re.escape(website_url)}/api/social)"\);'), r'const permanent_socket = io("/api/social");'),
        (re.compile(fr'const permanent_socket2 = io\("({re.escape(website_url)}/api/game)"\);'), r'const permanent_socket2 = io("/api/game");'),
        (re.compile(fr'const socket2 = io\("({re.escape(website_url)}/api/game)"\);'), r'const socket2 = io("/api/game");'),
        (re.compile(fr'const socket2 = io\("({re.escape(website_url)}/api/social)"\);'), r'const socket2 = io("/api/social");'),
        (re.compile(fr'const socket = io\("({re.escape(website_url)}/api/social)"\);'), r'const socket = io("/api/social");'),
        (re.compile(fr'const socket = io\("({re.escape(website_url)}/api/game)"\);'), r'const socket = io("/api/game");'),
        (re.compile(fr'const baseUrl = "{re.escape(website_url)}";'), r'const baseUrl = window.location.origin;'),
    ]

    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                file_path = os.path.join(root, file)
                replace_in_file(file_path, search_replace_pairs)

def main():
    if len(sys.argv) > 1:
        website_url = sys.argv[1].rstrip('/')
    else:
        website_url = "https://quanridor.ps8.academy"

    root_dir = 'mobile/www'
    process_files(root_dir, website_url)

if __name__ == '__main__':
    main()