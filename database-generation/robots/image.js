const imageDownloader = require('image-downloader')
const google = require('googleapis').google
const customSearch = google.customsearch('v1')
//const state = require('./state.js')
var shell = require('shelljs');

const googleSearchCredentials = require('../credentials/google-search.json')

async function robot() {
    console.log('> [image-robot] Starting...')
    //const content = state.load()
    const content = {
        length: 1,
        data: [{
            wine: 'domaine de la romanée-conti romanée-conti grand cru',
            vintage: 2011
        }]
    }

    await fetchImagesOfAllSentences(content)
    await downloadAllImages(content)

    //state.save(content)

    async function fetchImagesOfAllSentences(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.length; sentenceIndex++) {
            let query

            query = `${content.data[sentenceIndex].wine} ${content.data[sentenceIndex].vintage}`
            
            console.log(`> [image-robot] Querying Google Images with: "${query}"`)

            content.data[sentenceIndex].images = await fetchGoogleAndReturnImagesLinks(query)
            content.data[sentenceIndex].googleSearchQuery = query
        }
    }

    async function fetchGoogleAndReturnImagesLinks(query) {
        const response = await customSearch.cse.list({
            auth: googleSearchCredentials.apiKey,
            cx: googleSearchCredentials.searchEngineId,
            q: query,
            searchType: 'image',
            num: 10
        })

        const imagesUrl = response.data.items.map((item) => {
            return item.link
        })

        return imagesUrl
    }

    async function downloadAllImages(content) {
        content.downloadedImages = []

        for (let sentenceIndex = 0; sentenceIndex < content.length; sentenceIndex++) {
            const images = content.data[sentenceIndex].images

            for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
                const imageUrl = images[imageIndex]

                try {
                    if (content.downloadedImages.includes(imageUrl)) {
                        throw new Error('Image already downloaded')
                    }
                    const folderName = `${content.data[sentenceIndex].wine}-${content.data[sentenceIndex].vintage}`;    
                    
                    createDatasetDirectory(folderName);
                    await downloadAndSave(imageUrl, folderName, `${sentenceIndex}-original.png`)
                    content.downloadedImages.push(imageUrl)
                    console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Image successfully downloaded: ${imageUrl}`)
                    break
                } catch (error) {
                    console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Error (${imageUrl}): ${error}`)
                }
            }
        }
    }
    function createDatasetDirectory(folderName) {
        shell.mkdir('-p', `./content/${folderName}/`);
    }
    async function downloadAndSave(url, folderName, fileName) {
        return imageDownloader.image({
            url: url,
            dest: `./content/${folderName}/${fileName}`
        })
    }

}

module.exports = robot