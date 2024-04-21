import { MockDecorator } from './addons/ModuleMock/MockDecorator.js';
import { NodeInfoDecorator } from './addons/NodeInfo/NodeInfoDecorator.js';

export { parameters } from './addons/ModuleMock/MockDecorator.js';

export const decorators = [MockDecorator, NodeInfoDecorator];
