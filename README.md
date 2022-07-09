twister-html
============

HTML interface for twister core.

See git repo [here](https://github.com/twisterarmy/twister-core).
Official (currently unmaintained) [version](https://github.com/miguelfreitas/twister-core)

Stable releses available on this [page](https://github.com/twisterarmy/twister-html/releases).

To use development version, clone this repo under `~/.twister/html` like this:

    git clone https://github.com/twisterarmy/twister-html.git ~/.twister/html

If you're on **Mac OS X** — clone to `${HOME}/Library/Application\ Support/Twister/html` instead of `~/.twister/html`

Switch the edition
-----------------

TA Edition includes official Blaster updates and alternative features. To switch it, use followig commands:

    git pull && git checkout twisterarmy

If you want to switch blaster branch:

    git checkout blaster

If the master branch:

    git checkout master

Get updates:

    git pull

Contribute
----------

Feel free to fork and send pull requests!

To make it easier for us to accept your patches, please follow the conventional GitHub workflow
and keep in mind that your pull requests should have **twisterarmy** branch as both the origin and target.

1. After forking, clone your repo:

        rm -rf ~/.twister/html  # in case you already have it cloned from not your repo
        git clone git@github.com:YOURNICKNAME/twister-html.git ~/.twister/html
        cd ~/.twister/html

2. Switch to 'twisterarmy' branch:

        git checkout twisterarmy

3. CREATE A NEW BRANCH, specific to the branch prefix and fix you're implementing:

        git checkout -b twisterarmy-my-awesome-fix

4. Make your changes.

5. Commit and push:

        git commit -m "fix of #12345: bad foobarizer" && git push --set-upstream origin twisterarmy-my-awesome-fix

6. Now open a pull request from branch 'YOURNICKNAME:twisterarmy-my-awesome-fix' to 'twisterarmy:twisterarmy' on GitHub.

7. Once the request is accepted, switch back to 'twisterarmy' and track changes in upstream repo:

        git remote add upstream https://github.com/twisterarmy/twister-html.git  # this is one-off setup
        git fetch upstream && git checkout twisterarmy
        git merge upstream/twisterarmy  # you should get a fast-forward message here
        git push

8. Alternatively, make your contribution into the official project:

        https://github.com/miguelfreitas

Translations
------------

If you want to add your own translation, edit `interface_localization.js` like this:

1. Fork the repo and create a new branch from 'twisterarmy' one:

        git clone git@github.com:YOURNICKNAME/twister-html.git ~/.twister/html
        cd ~/.twister/html && git checkout twisterarmy
        git checkout -b Klingon-translation

2. Add your language to the list of available choices. You should use your ISO code here,
it should match what the browser reports. The Klingon ISO is 'tlh', so:

        var knownLanguages = ['en', 'nl', 'it', 'fr', ... , 'ru', 'tlh'];

For multi-region languages, if you want to catch them all, use only the first half
(e.g. to match it and it-ch, specify 'it').

3. Add a new wordset block after existing ones:

        if (preferredLanguage === 'tlh') {
            polyglot.locale('tlh');
            wordset = {
                'Insults': 'mu\'qaD',
                ...
            }
        }

4. Stage all changes in file `interface_localization.js`:

        git add interface_localization.js

5. Commit & push:

        git commit -m 'Klingon translation'
        git push origin Klingon-translation

6. Then open the pull request from branch 'YOURNICKNAME:Klingon-translation' to 'twisterarmy:twisterarmy' or 'twisterarmy:twisterarmy' on GitHub.

[Community support](https://github.com/twisterarmy/twister-html/issues)
[Official support](https://github.com/miguelfreitas/twister-core/issues)
