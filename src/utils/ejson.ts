/**
 * @see https://docs.mongodb.com/manual/reference/mongodb-extended-json/#example
 */

import saferEval from 'safer-eval'
import { map, repeat, size } from 'lodash'

import { MongoData } from '@/types'

function wrapKey(key: string) {
  const strKey = key.toString()
  if (strKey.includes('-') || strKey.includes('.') || /^\d/.test(strKey)) {
    return `"${key}"`
  }
  return key
}

export function stringify(val: MongoData, indent = 0, depth = 0): string {
  if (typeof val === 'string') {
    return JSON.stringify(val)
  }
  if (typeof val === 'number') {
    return val.toString()
  }
  if (typeof val === 'boolean') {
    return `${val}`
  }
  if (val === undefined) {
    return ''
  }
  if (val === null) {
    return 'null'
  }
  if ('$oid' in val) {
    return `ObjectId("${val.$oid}")`
  }
  if ('$date' in val && '$numberLong' in val.$date) {
    return `ISODate("${new Date(
      parseInt(val.$date.$numberLong, 10),
    ).toISOString()}")`
  }
  if ('$numberDecimal' in val) {
    return `NumberDecimal("${val.$numberDecimal}")`
  }
  if ('$numberDouble' in val) {
    return val.$numberDouble
  }
  if ('$numberInt' in val) {
    return val.$numberInt
  }
  if ('$numberLong' in val) {
    return `NumberLong("${val.$numberLong}")`
  }
  if ('$regularExpression' in val) {
    return `/${val.$regularExpression.pattern}/${
      val.$regularExpression.options || ''
    }`
  }
  if ('$timestamp' in val) {
    return `Timestamp(${val.$timestamp.t}, ${val.$timestamp.i})`
  }
  if ('$binary' in val) {
    return `BinData(${parseInt(val.$binary.subType, 16)}, "${
      val.$binary.base64
    }")`
  }
  const spaces = repeat(' ', depth)
  if (Array.isArray(val)) {
    if (indent === 0) {
      return `[${val
        .map((v) => `${stringify(v, indent, depth + indent)}`)
        .join(', ')}]`
    }
    return val.length
      ? `[\n${val
          .map((v) => `  ${spaces}${stringify(v, indent, depth + indent)}`)
          .join(',\n')}\n${spaces}]`
      : '[]'
  }
  if (size(val) === 0) {
    return '{}'
  }
  if (indent === 0) {
    return `{ ${map(
      val,
      (value, key) =>
        `${wrapKey(key)}: ${stringify(value, indent, depth + indent)}`,
    ).join(', ')} }`
  }
  return `{\n${map(
    val,
    (value, key) =>
      `  ${spaces}${wrapKey(key)}: ${stringify(value, indent, depth + indent)}`,
  ).join(',\n')}\n${spaces}}`
}

export const sandbox = {
  SubType: {
    Generic: 0x0,
    Function: 0x1,
    Binary_old: 0x2,
    UUID_old: 0x3,
    UUID: 0x4,
    MD5: 0x5,
    Encrypted: 0x6,
    UserDefined: 0x80,
  },
  ObjectId: (s: string) => ({
    $oid: s,
  }),
  Date: (s: string | number) => ({
    $date: {
      $numberLong: new Date(s).getTime().toString(),
    },
  }),
  ISODate: (s: string | number) => ({
    $date: {
      $numberLong: new Date(s).getTime().toString(),
    },
  }),
  NumberDecimal: (s: string | number) => ({
    $numberDecimal: s.toString(),
  }),
  NumberInt: (s: string | number) => ({
    $numberInt: s.toString(),
  }),
  NumberLong: (s: string | number) => ({
    $numberLong: s.toString(),
  }),
  Timestamp: (t: number, i: number) => ({
    $timestamp: {
      t,
      i,
    },
  }),
  BinData: (subType: number, base64: string) => ({
    $binary: {
      base64,
      subType: subType.toString(16),
    },
  }),
}

export function parse(str: string): MongoData {
  return JSON.parse(
    JSON.stringify(saferEval(str, sandbox), (_key, value) => {
      if (value instanceof RegExp) {
        return {
          $regularExpression: {
            pattern: value.source,
            options: value.flags,
          },
        }
      }
      return value
    }),
  )
}
