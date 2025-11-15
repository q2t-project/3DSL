export class Renderer {
  constructor({ adapter } = {}) {
    this.adapter = adapter;
  }

  render(scene) {
    throw new Error('Renderer.render is not implemented yet');
  }
}
