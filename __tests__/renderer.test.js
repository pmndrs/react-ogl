import { render } from '../src/test'

describe('renderer', () => {
  it('should correctly render JSX', async () => {
    const state = await render(<transform />)
    expect(state.scene.children.length).not.toBe(0)
  })
})
