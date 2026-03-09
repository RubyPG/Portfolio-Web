export type BannerLayerSource = 'sun' | 'clouds'

export type BannerLayer = {
  id: string
  source: BannerLayerSource
  className: string
  depth: number
}

const skyBannerLayers: BannerLayer[] = [
  {
    id: 'clouds-back',
    source: 'clouds',
    className: 'skybanner__layer--clouds-back',
    depth: 0.18,
  },
  {
    id: 'sun',
    source: 'sun',
    className: 'skybanner__layer--sun',
    depth: 0.5,
  },
  {
    id: 'clouds-front',
    source: 'clouds',
    className: 'skybanner__layer--clouds-front',
    depth: 0.92,
  },
]

export default skyBannerLayers
