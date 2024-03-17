# browser-operator/rakuten-sec

- This gets stock price that you have and market price information from [rakuten security](https://www.rakuten-sec.co.jp/).

## Requirements

- node v20.11.1
  - It is no problem probably another versions.
- npm 10.2.4
  - It is no problem probably another versions (or yarn).

## Installation

```bash
 npm install
```

## How to use

```bash
  npm run start
```

- then to be output to console.

## Enviroments

- USERNAME
  - required
  - rakuten sec account's user name
- PASSWORD
  - optional
  - rakuten sec account's user password
  - To obtain from keychain if this env is present.
- EXECUTABLE_PATH
  - optional
  - chromium path
- FILE_OUTPUT
  - optional
  - output to `./output.txt` if true

## Caution

- This and author will not be held responsible for any inconvenience caused by using this.
- This tool demand to use privately and properly.
