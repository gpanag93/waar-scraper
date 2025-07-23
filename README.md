Simple scraper that scrapes observations of stinkbugs from waarnemingen.be with a specific format and extracts the information to an excel sheet.

The code requires a .env file at the root directory to function. This file should contain the waarnemingen.be account in format:
USERNAME="<email>"
PASSWORD="<password>"

If you need a version of this directly tailored to your needs you can email me at gpanag93@gmail.com

Entry point (main function) is scraper.ts
