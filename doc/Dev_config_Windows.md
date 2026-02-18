---
title: `rr-database` repo configuration on Windows
---

::: callout-note
This guide assumes the latest Python version will be installed by default, i.e. 3.14 currently
:::

# Install Python

1. Download the [Python install manager](https://www.python.org/ftp/python/pymanager/python-manager-25.2.msix) from the [Python Downloads page](https://www.python.org/downloads).
2. Run the Python install manager ("python-manager-25.2.msix")
3. Follow through the installation instructions. (I performed all the recommended steps; watch out! Most of them are not the "default option")
4. Open a console window (e.g., "Windows menu", then type "cmd" + ENTER)
5. type "py install 3.11" + ENTER to install Python 3.11 (as indicated in [the scheduled workflow](https://github.com/doomlab/rr-database/blob/9266f313227af12dbc709a676639955a9626a6ac/.github/workflows/update.yaml#L21))

# Clone the repository

1. Install [the git client](https://git-scm.com/install) (if it is not already installed)
2. Make sure to have read access to the repository (right now its visibility is Public; if it weren't, ask [@doomlab](https://github.com/doomlab) for access)
3. Clone locally (there are different ways of doing this, but from the console, usually just type "git clone https://github.com/doomlab/rr-database.git")

# Configure Zotero API

1. Copy the code with the environment variables from [the repository instructions](https://github.com/doomlab/rr-database?tab=readme-ov-file#rr-database)
2. Paste the contents to a text file and save it to your local repository clone root folder with the name ".env"
3. Browse to the [Zotero security page](https://www.zotero.org/settings/security)
4. Under the "Applications" section, click on "Create new private key"
5. In "Key Name" fill in, e.g. "RR Database Key"
6. In "Personal Library" untick all checkboxes (personal library access won't be necessary)
7. In "Default Group Permissions" select "None" (access to other groups besides the RR database libraries won't be necessary either)
8. In "Specific Groups" tick the "Per Group Permissions" checkbox
9. In "RR Database Staging" select "Read Only"
10. In all other group library entries, select "None"
11. In the confirmation page, copy the API key to the clipboard
12. In file ".env", overwrite `YOURAPI` in lines 1 and 7 with the key value

# Install dependencies

::: callout-note
The instructions for installing the PIP (Pip Installs Packages) package manager are adapted from [phoenixNAP](https://phoenixnap.com/kb/install-pip-windows), and may be incomplete.
Please refer to the original source if you find issues following these steps.
:::

1. Open a console window (e.g., "Windows menu", then type "cmd" + ENTER)
2. Type `where pip` + ENTER to find the "pip" installation
3. If "pip" is not found, type `python -m ensurepip --upgrade` + ENTER
4. Go back to step 2 to make sure "pip" was correctly installed, then continue

::: callout-warning
The following step [may be destructive and lead to unstability of the Windows system](https://stackoverflow.com/a/28778358/1585338).
Please run with caution.
:::

5. Add "pip" to the "%path%" environment variable in Windows. For this, first run the console in "admin mode", then type in, e.g.: `setx path "%path%;[path_to_pip_folder]"`.
6. Type `py -3.11 -m pip install -r requirements.txt` + ENTER

# Test processing scripts

1. Open a console window (e.g., "Windows menu", then type "cmd" + ENTER)
2. Type `py -3.11 scripts/pull_zotero_library.py` + ENTER
3. Wait for the script to finish running (it may take a while). If it runs without errors, the following will be put out to the console:

```
Pulled <XXXX> Zotero items
Saved zotero_raw.json and source_of_truth.json
```

with `<XXXX>` being an integer number of recrods read (e.g., `Pulled 4057 Zotero items`), followed by the "prompt symbol" of the console.
