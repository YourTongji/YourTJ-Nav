/** Surface materials. The ids are the `data-material` values in index.css. */
export const materials = [
  { id: "frosted", label: "磨砂", hint: "轻模糊，看得见底下的照片" },
  { id: "acrylic", label: "亚克力", hint: "更厚更实，接近系统面板" },
  { id: "liquid", label: "液态玻璃", hint: "极薄，边缘有一道高光" },
] as const

export type MaterialId = (typeof materials)[number]["id"]

export const materialIds = materials.map((item) => item.id) as unknown as readonly MaterialId[]

export const defaultMaterialId: MaterialId = "frosted"
