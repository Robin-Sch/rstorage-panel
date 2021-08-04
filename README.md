# RStorage

RStorage is an encrypted cloud file storage.

## Installation

Install [nodejs](https://nodejs.org/en/download/).

Rename `.env.example` to `.env`, and fill in the secrets.

Run `npm i` to install the dependencies.

## Usage

Run `npm run start-panel` to start the RStorage panel.

Run `npm run start-node` to start a node.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## What has to be done?

#### Panel
* login system
	* [x] basic login system
	* [ ] email verification + password reset
* connecting node to panel
	* [ ] generating random key

#### Node
* connecting node to panel
	* [ ] connecting using random key
* storing files
	* [ ] saving files
	* [ ] encrypting files
	* [ ] spread file contents over nodes?

## License
[MIT](https://choosealicense.com/licenses/mit/)
