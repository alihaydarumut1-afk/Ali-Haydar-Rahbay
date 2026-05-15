export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

export default async function getCroppedAvatar(imageSrc, pixelCrop, targetSize = 256) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  // Optimizasyon: Çözünürlüğü sabitle (Örn: 256x256)
  canvas.width = targetSize
  canvas.height = targetSize

  // Kırpılan alanı al ve yeni canvas'ın boyutlarına ölçekle
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  )

  // Canvas'ı Base64 formatına çevir (Kaliteyi 0.85 olarak ayarlayarak optimize et)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      blob.name = 'avatar.jpeg'
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = () => resolve(reader.result)
    }, 'image/jpeg', 0.85)
  })
}