const imageDownloader = require('image-downloader')
const google = require('googleapis').google
const customSearch = google.customsearch('v1')
const state = require('./state.js')
var shell = require('shelljs');

const googleSearchCredentials = require('../credentials/google-search.json')

async function robot() {
    console.log('> [image-robot] Starting...')
    const content = state.load()
    await fetchImagesOfAllSentences(content)
    await downloadAllImages(content)
    
    state.save(content)

    async function fetchImagesOfAllSentences(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.length; sentenceIndex++) {
            let query

            query = `Label of ${content.data[sentenceIndex].wine} ${content.data[sentenceIndex].vintage} ${content.data[sentenceIndex].color}`
            queryByLabel = `label-of-${content.data[sentenceIndex].label}-${content.data[sentenceIndex].vintage}-${content.data[sentenceIndex].color}`
            
            console.log(`> [image-robot] Querying Google Images with: "${query}" and "${queryByLabel}"`)

            content.data[sentenceIndex].images = [...await fetchGoogleAndReturnImagesLinks(query), ...await fetchGoogleAndReturnImagesLinks(queryByLabel)]
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
                    const folderName = `${content.data[sentenceIndex].label}-${content.data[sentenceIndex].color}-${content.data[sentenceIndex].vintage}`;    
                    
                    await createDatasetDirectory(folderName);
                    await downloadAndSave(imageUrl, folderName, `${sentenceIndex}-${imageIndex}-original.png`)
                    content.downloadedImages.push(imageUrl)
                    console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Image successfully downloaded: ${imageUrl}`)
                    continue
                } catch (error) {
                    console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Error (${imageUrl}): ${error}`)
                }
            }
        }
    }
    async function createDatasetDirectory(folderName) {
        return new Promise(resolve => {
            shell.mkdir('-p', `./content/${folderName}/`);
            resolve(true);
        })
    }
    async function downloadAndSave(url, folderName, fileName) {
        return imageDownloader.image({
            url: url,
            dest: `./content/${folderName}/${fileName}`
        })
    }

}

module.exports = robot