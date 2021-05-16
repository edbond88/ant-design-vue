import { flattenChildren, getPropsSlot, isValidElement } from '../../_util/props-util';
import PropTypes from '../../_util/vue-types';
import { computed, defineComponent, getCurrentInstance, ref, watch } from 'vue';
import { useInjectKeyPath } from './hooks/useKeyPath';
import { useInjectFirstLevel, useInjectMenu } from './hooks/useMenuContext';
import { cloneElement } from '../../_util/vnode';
import Tooltip from '../../tooltip';

let indexGuid = 0;

export default defineComponent({
  name: 'AMenuItem',
  props: {
    role: String,
    disabled: Boolean,
    danger: Boolean,
    title: { type: [String, Boolean] },
    icon: PropTypes.VNodeChild,
  },
  emits: ['mouseenter', 'mouseleave'],
  slots: ['icon'],
  inheritAttrs: false,
  setup(props, { slots, emit, attrs }) {
    const instance = getCurrentInstance();
    const key = instance.vnode.key;
    const uniKey = `menu_item_${++indexGuid}`;
    const parentKeys = useInjectKeyPath();
    console.log(parentKeys.value);
    const {
      prefixCls,
      activeKeys,
      disabled,
      changeActiveKeys,
      rtl,
      inlineCollapsed,
      siderCollapsed,
    } = useInjectMenu();
    const firstLevel = useInjectFirstLevel();
    const isActive = ref(false);
    watch(
      activeKeys,
      () => {
        isActive.value = !!activeKeys.value.find(val => val === key);
      },
      { immediate: true },
    );
    const mergedDisabled = computed(() => disabled.value || props.disabled);
    const selected = computed(() => false);
    const classNames = computed(() => {
      const itemCls = `${prefixCls.value}-item`;
      return {
        [`${itemCls}`]: true,
        [`${itemCls}-danger`]: props.danger,
        [`${itemCls}-active`]: isActive.value,
        [`${itemCls}-selected`]: selected.value,
        [`${itemCls}-disabled`]: mergedDisabled.value,
      };
    });
    const onMouseEnter = (event: MouseEvent) => {
      if (!mergedDisabled.value) {
        changeActiveKeys([...parentKeys.value, key]);
        emit('mouseenter', event);
      }
    };
    const onMouseLeave = (event: MouseEvent) => {
      if (!mergedDisabled.value) {
        changeActiveKeys([]);
        emit('mouseleave', event);
      }
    };

    const renderItemChildren = (icon: any, children: any) => {
      // inline-collapsed.md demo 依赖 span 来隐藏文字,有 icon 属性，则内部包裹一个 span
      // ref: https://github.com/ant-design/ant-design/pull/23456
      if (!icon || (isValidElement(children) && children.type === 'span')) {
        if (children && inlineCollapsed.value && firstLevel && typeof children === 'string') {
          return (
            <div class={`${prefixCls.value}-inline-collapsed-noicon`}>{children.charAt(0)}</div>
          );
        }
        return children;
      }
      return <span class={`${prefixCls.value}-title-content`}>{children}</span>;
    };

    return () => {
      const { title } = props;
      const children = flattenChildren(slots.default?.());
      const childrenLength = children.length;
      let tooltipTitle: any = title;
      if (typeof title === 'undefined') {
        tooltipTitle = firstLevel ? children : '';
      } else if (title === false) {
        tooltipTitle = '';
      }
      const tooltipProps: any = {
        title: tooltipTitle,
      };

      if (!siderCollapsed.value && !inlineCollapsed.value) {
        tooltipProps.title = null;
        // Reset `visible` to fix control mode tooltip display not correct
        // ref: https://github.com/ant-design/ant-design/issues/16742
        tooltipProps.visible = false;
      }

      // ============================ Render ============================
      const optionRoleProps = {};

      if (props.role === 'option') {
        optionRoleProps['aria-selected'] = selected.value;
      }

      const icon = getPropsSlot(slots, props, 'icon');
      return (
        <Tooltip
          {...tooltipProps}
          placement={rtl.value ? 'left' : 'right'}
          overlayClassName={`${prefixCls.value}-inline-collapsed-tooltip`}
        >
          <li
            {...attrs}
            class={[
              classNames.value,
              {
                [`${attrs.class}`]: !!attrs.class,
                [`${prefixCls.value}-item-only-child`]:
                  (icon ? childrenLength + 1 : childrenLength) === 1,
              },
            ]}
            role={props.role || 'menuitem'}
            tabindex={props.disabled ? null : -1}
            data-menu-id={key}
            aria-disabled={props.disabled}
            {...optionRoleProps}
            onMouseenter={onMouseEnter}
            onMouseleave={onMouseLeave}
            title={typeof title === 'string' ? title : undefined}
          >
            {cloneElement(icon, {
              class: `${prefixCls.value}-item-icon`,
            })}
            {renderItemChildren(icon, children)}
          </li>
        </Tooltip>
      );
    };
  },
});
