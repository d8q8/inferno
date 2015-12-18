import isArray from '../../util/isArray';
import { isRecyclingEnabled, recycle } from '../recycling';
import { getValueWithIndex, getValueForProps } from '../../core/variables';
import { updateKeyed } from '../domMutate';
import { addDOMDynamicAttributes, updateDOMDynamicAttributes } from '../addAttributes';
import recreateRootNode from '../recreateRootNode';
import updateComponent from '../../core/updateComponent';

const recyclingEnabled = isRecyclingEnabled();

export default function createRootNodeWithComponent(componentIndex, props, domNamespace) {
	let instance;
	let lastRender;
  let currentItem;
	const node = {
    pool: [],
    keyedPool: [],
    create(item, treeLifecycle) {
      let domNode;

      if (recyclingEnabled) {
        domNode = recycle(node, item);
        if (domNode) {
          return domNode;
        }
      }
      const Component = getValueWithIndex(item, componentIndex);

      if (Component == null) {
        //bad component, make a text node
        domNode = document.createTextNode('');
        item.rootNode = domNode;
        return domNode;
      }
      instance = new Component(getValueForProps(props, item));
      instance.componentWillMount();
      const nextRender = instance.render();

      nextRender.parent = item;
      domNode = nextRender.domTree.create(nextRender, treeLifecycle);
      item.rootNode = domNode;
      lastRender = nextRender;
      treeLifecycle.addTreeSuccessListener(instance.componentDidMount);
      instance.forceUpdate = () => {
        const nextRender = instance.render();

        nextRender.parent = currentItem;
        nextRender.domTree.update(lastRender, nextRender, treeLifecycle);
        currentItem.rootNode = nextRender.rootNode;
        lastRender = nextRender;
      };
      currentItem = item;
      return domNode;
    },
    update(lastItem, nextItem, treeLifecycle) {
      const Component = getValueWithIndex(nextItem, componentIndex);

      if (node !== lastItem.domTree || Component !== instance.constructor) {
        recreateRootNode(lastItem, nextItem, node, treeLifecycle);
        return;
      }
      const domNode = lastItem.rootNode;
      const prevProps = instance.props;
      const prevState = instance.state;
      const nextState = instance.state;
      const nextProps = getValueForProps(props, nextItem);

      currentItem = nextItem;
      nextItem.rootNode = domNode;
      updateComponent(instance, prevState, nextState, prevProps, nextProps, instance.forceUpdate);
    },
    remove(item, treeLifecycle) {
      if (instance) {
        lastRender.domTree.remove(lastRender, treeLifecycle);
        instance.componentWillUnmount();
      }
    }
  };
	return node;
}
