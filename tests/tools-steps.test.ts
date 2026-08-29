import { describe, expect, it } from 'vitest'
import { coerceStepsArg, normalizeStepsCapability } from '../src/dsh/tools.js'

describe('media_create_task steps 容错（coerceStepsArg）', () => {
  it('JSON 字符串数组被还原为数组', () => {
    const raw = JSON.stringify([{ id: 'gen', capability: 'text-to-image' }])
    expect(coerceStepsArg(raw)).toEqual([{ id: 'gen', capability: 'text-to-image' }])
  })

  it('数组直传原样返回', () => {
    const arr = [{ id: 'a' }]
    expect(coerceStepsArg(arr)).toBe(arr)
  })

  it('非法字符串原样返回（由数组校验兜底报错）', () => {
    expect(coerceStepsArg('not-json')).toBe('not-json')
  })

  it('空串/空白串原样返回', () => {
    expect(coerceStepsArg('')).toBe('')
    expect(coerceStepsArg('   ')).toBe('   ')
  })

  it('null/undefined 原样返回', () => {
    expect(coerceStepsArg(null)).toBe(null)
    expect(coerceStepsArg(undefined)).toBe(undefined)
  })

  it('对象直传原样返回', () => {
    const o = { id: 'gen' }
    expect(coerceStepsArg(o)).toBe(o)
  })
})

describe('media_create_task capability 复合键容错（normalizeStepsCapability）', () => {
  it('type@recipeId 复合键拆分归位（recipeId 缺省回填）', () => {
    const steps = [{ id: 'gen', capability: 'multi-image-to-video@8-minimax-v1-600-lora', inputs: { prompt: 'x' } }]
    normalizeStepsCapability(steps)
    expect(steps[0]).toMatchObject({ capability: 'multi-image-to-video', recipeId: '8-minimax-v1-600-lora' })
  })

  it('显式 recipeId 优先于复合键拆出的部分', () => {
    const steps = [{ id: 'gen', capability: 'image-to-video@recipe-a', recipeId: 'recipe-b' }]
    normalizeStepsCapability(steps)
    expect(steps[0]).toMatchObject({ capability: 'image-to-video', recipeId: 'recipe-b' })
  })

  it('纯 capability 原样不变（无 @ 不处理）', () => {
    const steps = [{ id: 'gen', capability: 'text-to-image', recipeId: 'txt2img-default' }]
    normalizeStepsCapability(steps)
    expect(steps[0]).toMatchObject({ capability: 'text-to-image', recipeId: 'txt2img-default' })
  })

  it('@ 前后为空时不拆分（防误伤）', () => {
    const steps = [{ id: 'gen', capability: '@recipe' }, { id: '2', capability: 'type@' }]
    normalizeStepsCapability(steps)
    expect(steps[0]!.capability).toBe('@recipe')
    expect(steps[1]!.capability).toBe('type@')
  })

  it('非数组原样返回', () => {
    expect(normalizeStepsCapability(null)).toBe(null)
    expect(normalizeStepsCapability('str')).toBe('str')
  })
})
