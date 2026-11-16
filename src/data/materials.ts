/** Surface materials. The ids are the `data-material` values in index.css. */
export const materials = [
  { id: "frosted", label: "磨砂", hint: "柔和，任何壁纸都稳" },
  { id: "acrylic", label: "亚克力", hint: "厚实，带细颗粒" },
  { id: "liquid", label: "液态玻璃", hint: "通透，光在边缘" },
] as const

export type MaterialId = (typeof materials)[number]["id"]

export const materialIds = materials.map((item) => item.id) as unknown as readonly MaterialId[]

export const defaultMaterialId: MaterialId = "frosted"
