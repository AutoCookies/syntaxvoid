# Contributing to SyntaxVoid

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing to SyntaxVoid and its packages. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

#### Table Of Contents

[Code of Conduct](#code-of-conduct)

[I don't want to read this whole thing, I just have a question!!!](#i-dont-want-to-read-this-whole-thing-i-just-have-a-question)

[What should I know before I get started?](#what-should-i-know-before-i-get-started)
  * [SyntaxVoid and Packages](#syntaxvoid-and-packages)
  * [Design Decisions](#design-decisions)

[How Can I Contribute?](#how-can-i-contribute)
  * [Reporting Bugs](#reporting-bugs)
  * [Suggesting Enhancements](#suggesting-enhancements)
  * [Your First Code Contribution](#your-first-code-contribution)
  * [Pull Requests](#pull-requests)

[Styleguides](#styleguides)
  * [Git Commit Messages](#git-commit-messages)
  * [JavaScript Styleguide](#javascript-styleguide)
  * [CoffeeScript Styleguide](#coffeescript-styleguide)
  * [Specs Styleguide](#specs-styleguide)
  * [Documentation Styleguide](#documentation-styleguide)

[Additional Notes](#additional-notes)
  * [Issue and Pull Request Labels](#issue-and-pull-request-labels)

## Code of Conduct

This project and everyone participating in it is governed by the [SyntaxVoid Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## I don't want to read this whole thing I just have a question!!!

> **Note:** Please don't file an issue to ask a question. You'll get faster results by using our community channels.

## What should I know before I get started?

### SyntaxVoid and Packages

SyntaxVoid is a large open source project. When you initially consider contributing to SyntaxVoid, you might be unsure about which repository implements the functionality you want to change or report a bug for.

SyntaxVoid is intentionally very modular. Nearly every non-editor UI element you interact with comes from a package. These packages are bundled into the default distribution.

To get a sense for the packages that are bundled with SyntaxVoid, you can go to `Settings` > `Packages` within SyntaxVoid and take a look at the Core Packages section.

Here's a list of the big ones:

* [syntaxvoid-ide/syntaxvoid](https://github.com/syntaxvoid-ide/syntaxvoid) - SyntaxVoid Core! The core editor component.
* [tree-view](https://github.com/syntaxvoid-ide/tree-view) - file and directory listing.
* [fuzzy-finder](https://github.com/syntaxvoid-ide/fuzzy-finder) - the quick file opener.
* [find-and-replace](https://github.com/syntaxvoid-ide/find-and-replace) - all search and replace functionality.
* [tabs](https://github.com/syntaxvoid-ide/tabs) - the tabs for open editors.
* [status-bar](https://github.com/syntaxvoid-ide/status-bar) - the status bar.
* [settings-view](https://github.com/syntaxvoid-ide/settings-view) - the settings UI.
* [command-palette](https://github.com/syntaxvoid-ide/command-palette) - The command palette.

### Design Decisions

When we make a significant decision in how we maintain the project and what we can or cannot support, we will document it in our design docs.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for SyntaxVoid. Following these guidelines helps maintainers and the community understand your report :pencil:, reproduce the behavior :computer: :computer:, and find related reports :mag_right:.

Before creating bug reports, please check [this list](#before-submitting-a-bug-report) as you might find out that you don't need to create one. When you are creating a bug report, please [include as many details as possible](#how-do-i-submit-a-good-bug-report).

> **Note:** If you find a **Closed** issue that seems like it is the same thing that you're experiencing, open a new issue and include a link to the original issue in the body of your new one.

#### Before Submitting A Bug Report

* **Check the debugging guide.** You might be able to find the cause of the problem and fix things yourself.
* **Determine which repository the problem should be reported in**.
* **Perform a cursory search** to see if the problem has already been reported.

#### How Do I Submit A (Good) Bug Report?

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/). Create an issue on the relevant repository and provide the following information:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem.
* **If you're reporting that SyntaxVoid crashed**, include a crash report with a stack trace.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for SyntaxVoid, including completely new features and minor improvements to existing functionality.

#### How Do I Submit A (Good) Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://guides.github.com/features/issues/). Create an issue on that repository and provide the following information:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Include screenshots and animated GIFs** which help you demonstrate the steps.
* **Explain why this enhancement would be useful** to most SyntaxVoid users.

### Your First Code Contribution

Unsure where to begin contributing to SyntaxVoid? You can start by looking through `beginner` and `help-wanted` issues.

#### Local development

SyntaxVoid Core and all packages can be developed locally.

### Pull Requests

The process described here has several goals:

- Maintain SyntaxVoid's quality
- Fix problems that are important to users
- Engage the community in working toward the best possible SyntaxVoid
- Enable a sustainable system for SyntaxVoid's maintainers to review contributions

Please follow these steps to have your contribution considered by the maintainers:

1. Follow all instructions in the pull request template (provided when opening a PR).
2. Follow the [styleguides](#styleguides)
3. After you submit your pull request, verify that all status checks are passing.

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Consider starting the commit message with an applicable emoji:
    * :art: `:art:` when improving the format/structure of the code
    * :racehorse: `:racehorse:` when improving performance
    * :memo: `:memo:` when writing docs
    * :bug: `:bug:` when fixing a bug
    * :fire: `:fire:` when removing code or files
    * :green_heart: `:green_heart:` when fixing the CI build
    * :white_check_mark: `:white_check_mark:` when adding tests
    * :lock: `:lock:` when dealing with security

### JavaScript Styleguide

All JavaScript code is linted with [Prettier](https://prettier.io/).

* Prefer the object spread operator (`{...anotherObj}`) to `Object.assign()`
* Inline `export`s with expressions whenever possible
* Place requires in the following order:
    * Built in Node Modules (such as `path`)
    * Built in SyntaxVoid and Electron Modules (such as `atom`, `remote`)
    * Local Modules (using relative paths)

### CoffeeScript Styleguide

* Set parameter defaults without spaces around the equal sign
* Use spaces around operators
* Use spaces after commas
* Use parentheses if it improves code clarity.

## Additional Notes

### Issue and Pull Request Labels

This section lists the labels we use to help us track and manage issues and pull requests.

#### Type of Issue and Issue State

| Label name | Description |
| --- | --- |
| `enhancement` | Feature requests. |
| `bug` | Confirmed bugs or reports that are very likely to be bugs. |
| `question` | Questions more than bug reports or feature requests. |
| `feedback` | General feedback more than bug reports or feature requests. |
| `help-wanted` | The core team would appreciate help from the community. |
| `beginner` | Less complex issues which would be good first issues. |
| `more-information-needed` | More information needs to be collected about these problems. |
| `needs-reproduction` | Likely bugs, but haven't been reliably reproduced. |
| `blocked` | Issues blocked on other issues. |
| `duplicate` | Issues which are duplicates of other issues. |
| `wontfix` | The core team has decided not to fix these issues for now. |
| `invalid` | Issues which aren't valid. |
