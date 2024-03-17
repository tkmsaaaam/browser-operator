# browser-operator/rakuten-card

- This downloads recent Details(PDF, CSV) from [rakuten card](https://www.rakuten-card.co.jp/).

## Requirements

- node v20.11.1
  - It is no problem probably another versions.
- npm 10.2.4
  - It is no problem probably another versions (or yarn).

## Installation

```bash
 npm install
```

## Enviroments

- EMAIL
  - required
  - rakuten card account's email
- BASE_DIR
  - optional
  - The files are dowloaded to the path if this env is present (if it is not present to ./downloads).

## How to use

```bash
  npm run start
```

- then to be downloaded some details to `./downloads`.

## Caution

- We will not be held responsible for any inconvenience caused by using this.
