// @ts-ignore
import * as OGL from 'ogl'
import { Asset } from 'expo-asset'
import { readAsStringAsync } from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import { suspend } from 'suspend-react'
import { useOGL } from '../hooks'
import { buildGraph } from '../shared/utils'

/**
 * Generates an asset based on input type.
 */
export const getAsset = (input: Asset | string | number) => {
  if (input instanceof Asset) return input

  switch (typeof input) {
    case 'string':
      return Asset.fromURI(input)
    case 'number':
      return Asset.fromModule(input)
    default:
      throw 'Invalid asset! Must be a URI or module.'
  }
}

/**
 * Downloads from a local URI and decodes into an ArrayBuffer.
 */
export const toBuffer = async (localUri: string) => readAsStringAsync(localUri, { encoding: 'base64' }).then(decode)

/**
 * Loads assets suspensefully.
 */
export const useLoader = (loader: any, input: string | string[], extensions: (loader: any) => void) => {
  const { gl } = useOGL()

  // Put keys into an array so their contents are spread and cached with suspend
  const keys = Array.isArray(input) ? input : [input]

  return suspend(
    async (loader, ...urls) => {
      // Call extensions
      extensions?.(loader)

      const result = await Promise.all(
        urls.map(async (url) => {
          // There's no Image in native, so we create & return a data texture instead
          if (loader === OGL.TextureLoader) {
            const asset = await getAsset(url).downloadAsync()

            const image = { data: asset, width: asset.width, height: asset.height }
            const texture = new OGL.Texture(gl, { image })

            return texture
          }

          let data: any

          if (url.startsWith?.('http')) {
            // If asset is external and not an Image, load it
            data = await loader.load(gl, url)
          } else {
            // Otherwise, create a localUri and a file buffer
            const { localUri } = await getAsset(url).downloadAsync()
            const arrayBuffer = await toBuffer(localUri as string)
            data = await loader.parse(gl, arrayBuffer)
          }

          // Cleanup GLTF and build a graph
          if (data.scene) {
            const scene = data.scene?.length ? data.scene[0] : data.scene
            const graph = buildGraph(scene)

            Object.assign(data, { scene, ...graph })
          }

          return data
        }),
      )

      // Return result | result[], mirroring input | input[]
      return Array.isArray(input) ? result : result[0]
    },
    [loader, ...keys],
  )
}
