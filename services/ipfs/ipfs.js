const ipfsAPI = require('ipfs-api')

//TODO: dev/prod settings
const ipfs = ipfsAPI('localhost', '5001')

function addFileToIpfs(file) {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.from(file)
        ipfs.files.add(buffer)
            .then(function (result) {
                // console.log('addFileToIpfs result', result)
                return resolve(result[0].hash)
            })
            .catch(function (err) {
                //TODO: Logger
                console.log(err)
                return resolve('ipfs error', err)
            })
    })
}

module.exports = {
    addFileToIpfs: addFileToIpfs
}
