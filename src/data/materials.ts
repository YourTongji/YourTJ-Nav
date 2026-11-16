/** Surface materials. The ids are the `data-material` values in index.css. */
export const materials = [
  { id: "frosted", label: "磨砂" },
  { id: "acrylic", label: "亚克力" },
  { id: "liquid", label: "液态玻璃" },
] as const

export type MaterialId = (typeof materials)[number]["id"]

export const materialIds = materials.map((item) => item.id) as unknown as readonly MaterialId[]

export const defaultMaterialId: MaterialId = "frosted"
