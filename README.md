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

* login system
	* [x] basic login system
	* [ ] email verification + password reset
* connecting node to panel
	* [x] generating key pair on both panel and node
	* [x] connect using the node's public key
	* [ ] editing a node's details
	* [ ] deleting a node's details
* storing files
	* [ ] saving files
	* [ ] browsing files
	* [ ] encrypting files
	* [ ] spread file contents over all nodes?

## License
[MIT](https://choosealicense.com/licenses/mit/)
