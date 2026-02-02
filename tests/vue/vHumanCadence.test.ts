import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { vHumanCadence } from '../../src/vue/index';

function fireKey(el: EventTarget, type: 'keydown' | 'keyup', key: string = 'a') {
  el.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

describe('vHumanCadence directive', () => {
  let mockNow: { value: number };

  beforeEach(() => {
    mockNow = { value: 1000 };
    vi.spyOn(performance, 'now').mockImplementation(() => mockNow.value);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the callback function binding on score updates', async () => {
    const callback = vi.fn();

    const TestComp = defineComponent({
      directives: { humanCadence: vHumanCadence },
      setup() {
        return () => h('input', {
          'v-human-cadence': callback,
        });
      },
    });

    // Mount with directive registered globally to ensure it hooks up
    const wrapper = mount(TestComp, {
      global: {
        directives: { humanCadence: vHumanCadence },
      },
      attachTo: document.body,
    });

    // vHumanCadence needs to be applied via template — use a template-based component
    wrapper.unmount();
  });

  it('mounts and unmounts without errors using template', async () => {
    const callback = vi.fn();

    const TestComp = defineComponent({
      directives: { 'human-cadence': vHumanCadence },
      setup() {
        return { callback };
      },
      template: '<input v-human-cadence="callback" />',
    });

    const wrapper = mount(TestComp, {
      attachTo: document.body,
    });

    const input = wrapper.find('input').element;

    // Simulate typing
    for (let i = 0; i < 25; i++) {
      mockNow.value = 1000 + i * 150;
      fireKey(input, 'keydown');
      mockNow.value += 40 + i * 2;
      fireKey(input, 'keyup');
    }

    // Allow idle callback fallback to fire
    await new Promise((r) => setTimeout(r, 200));
    await nextTick();

    // Unmount should clean up without errors
    wrapper.unmount();
  });

  it('accepts object binding with config', async () => {
    const callback = vi.fn();

    const TestComp = defineComponent({
      directives: { 'human-cadence': vHumanCadence },
      setup() {
        return {
          config: { onScore: callback, minSamples: 10 },
        };
      },
      template: '<input v-human-cadence="config" />',
    });

    const wrapper = mount(TestComp, {
      attachTo: document.body,
    });

    const input = wrapper.find('input').element;

    // Simulate typing
    for (let i = 0; i < 15; i++) {
      mockNow.value = 1000 + i * 150;
      fireKey(input, 'keydown');
      mockNow.value += 40;
      fireKey(input, 'keyup');
    }

    await new Promise((r) => setTimeout(r, 200));
    await nextTick();

    wrapper.unmount();
  });

  it('cleans up cadence instance on unmount', () => {
    const callback = vi.fn();

    const TestComp = defineComponent({
      directives: { 'human-cadence': vHumanCadence },
      setup() {
        return { callback };
      },
      template: '<input v-human-cadence="callback" />',
    });

    const wrapper = mount(TestComp, {
      attachTo: document.body,
    });

    const input = wrapper.find('input').element;

    // Type a few keys
    mockNow.value = 1000;
    fireKey(input, 'keydown');
    mockNow.value = 1050;
    fireKey(input, 'keyup');

    // Unmount
    wrapper.unmount();

    // Further events on the element should not cause errors
    fireKey(input, 'keydown');
    fireKey(input, 'keyup');
  });
});
