/**
 * Pinyin initials without a dictionary: the browser already sorts Chinese by
 * pinyin (ICU's `co-pinyin` collation), so the initial of a character is the
 * last of these boundary characters it sorts after. 教务系统 → jwxt.
 *
 * The boundaries are the first character of each initial in that order; the
 * set was checked against a sample of every letter, including the R/S/T edge
 * where older lists drift. Characters with several readings take the one the
 * collation sorts by, which is the common one.
 */
const BOUNDARIES = "阿八嚓哒妸发旮哈讥咔垃痳拏噢妑七呥仨他穵夕丫帀"
const LETTERS = "abcdefghjklmnopqrstwxyz"
const HAN = /\p{Script=Han}/u

let collator: Intl.Collator | null = null
const cache = new Map<string, string>()

function initialOf(char: string) {
  if (!HAN.test(char)) return char.toLowerCase()
  collator ??= new Intl.Collator("zh-Hans-CN-u-co-pinyin")
  let letter = char
  for (let index = 0; index < BOUNDARIES.length; index += 1) {
    if (collator.compare(char, BOUNDARIES[index]) < 0) break
    letter = LETTERS[index]
  }
  return letter
}

/**
 * One letter per character of `text` (as code points), so an index into the
 * result is an index into `[...text]`: a match on the initials highlights the
 * characters it came from.
 */
export function initialsOf(text: string) {
  const cached = cache.get(text)
  if (cached !== undefined) return cached
  const value = [...text].map(initialOf).join("")
  cache.set(text, value)
  return value
}
