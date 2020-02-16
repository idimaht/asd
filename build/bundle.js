
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    const seen_callbacks = new Set();
    function flush() {
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const user = writable({
        username:'',
    });
    const pages = writable('Login'); // อยากให้ค่าเริ่มต้นเป็น 'Login'

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src\Layout.svelte generated by Svelte v3.18.1 */

    const file = "src\\Layout.svelte";

    function create_fragment(ctx) {
    	let main;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (default_slot) default_slot.c();
    			attr_dev(main, "class", "svelte-1ivap61");
    			add_location(main, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);

    			if (default_slot) {
    				default_slot.m(main, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 1) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[0], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [$$scope, $$slots];
    }

    class Layout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Layout",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\pages\Login.svelte generated by Svelte v3.18.1 */
    const file$1 = "src\\pages\\Login.svelte";

    // (67:2) {#if error}
    function create_if_block(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*error*/ ctx[2]);
    			set_style(p, "color", "red");
    			add_location(p, file$1, 67, 4, 1466);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 4) set_data_dev(t, /*error*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(67:2) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let section;
    	let div0;
    	let input0;
    	let t1;
    	let div1;
    	let input1;
    	let t2;
    	let p;
    	let t3;
    	let span;
    	let strong;
    	let t5;
    	let t6;
    	let button;
    	let dispose;
    	let if_block = /*error*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			section = element("section");
    			div0 = element("div");
    			input0 = element("input");
    			t1 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t2 = space();
    			p = element("p");
    			t3 = text("Don't have account ?\r\n    ");
    			span = element("span");
    			strong = element("strong");
    			strong.textContent = "Regeister";
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			button = element("button");
    			button.textContent = "Login";
    			document.title = "Login to forum";
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "username");
    			attr_dev(input0, "class", "svelte-82u9o7");
    			add_location(input0, file$1, 55, 4, 1120);
    			add_location(div0, file$1, 54, 2, 1109);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "password");
    			attr_dev(input1, "class", "svelte-82u9o7");
    			add_location(input1, file$1, 58, 4, 1211);
    			add_location(div1, file$1, 57, 2, 1200);
    			add_location(strong, file$1, 63, 6, 1398);
    			attr_dev(span, "class", "reg svelte-82u9o7");
    			add_location(span, file$1, 62, 4, 1330);
    			add_location(p, file$1, 60, 2, 1295);
    			attr_dev(button, "class", "button button-outline");
    			add_location(button, file$1, 69, 2, 1511);
    			attr_dev(section, "class", "container svelte-82u9o7");
    			add_location(section, file$1, 53, 0, 1078);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append_dev(section, t1);
    			append_dev(section, div1);
    			append_dev(div1, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(section, t2);
    			append_dev(section, p);
    			append_dev(p, t3);
    			append_dev(p, span);
    			append_dev(span, strong);
    			append_dev(section, t5);
    			if (if_block) if_block.m(section, null);
    			append_dev(section, t6);
    			append_dev(section, button);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[8]),
    				listen_dev(span, "click", /*gotoReg*/ ctx[4], false, false, false),
    				listen_dev(button, "click", /*onLogin*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*username*/ 1 && input0.value !== /*username*/ ctx[0]) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}

    			if (/*error*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(section, t6);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $user;
    	let $pages;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(5, $user = $$value));
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(6, $pages = $$value));
    	let username = "";
    	let password = "";
    	let error = "";

    	const onLogin = async () => {
    		$$invalidate(2, error = "");

    		if (!(username && password)) {
    			$$invalidate(2, error = "plz check username and password");
    			return;
    		}

    		let res = await fetch("http://localhost:1234/api/user/login", {
    			method: "POST",
    			body: JSON.stringify({ username, password }),
    			headers: { "content-type": "application/json" }
    		});

    		let text = await res.text();

    		if (res.ok) {
    			set_store_value(user, $user.username = username, $user);
    			set_store_value(pages, $pages = "Posts");
    		} else {
    			$$invalidate(2, error = text);
    		}
    	};

    	const gotoReg = () => {
    		set_store_value(pages, $pages = "Reg");
    	};

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    		if ("password" in $$props) $$invalidate(1, password = $$props.password);
    		if ("error" in $$props) $$invalidate(2, error = $$props.error);
    		if ("$user" in $$props) user.set($user = $$props.$user);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    	};

    	return [
    		username,
    		password,
    		error,
    		onLogin,
    		gotoReg,
    		$user,
    		$pages,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\components\ReplyForm.svelte generated by Svelte v3.18.1 */
    const file$2 = "src\\components\\ReplyForm.svelte";

    // (44:0) {#if active}
    function create_if_block$1(ctx) {
    	let button;
    	let t1;
    	let textarea;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "cancle";
    			t1 = space();
    			textarea = element("textarea");
    			set_style(button, "float", "right");
    			attr_dev(button, "class", "button-outline");
    			add_location(button, file$2, 44, 2, 1079);
    			attr_dev(textarea, "placeholder", "Content");
    			attr_dev(textarea, "class", "svelte-1rkipy4");
    			add_location(textarea, file$2, 50, 2, 1203);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*reply*/ ctx[1]);

    			dispose = [
    				listen_dev(button, "click", /*handleCancleClick*/ ctx[3], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[7])
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*reply*/ 2) {
    				set_input_value(textarea, /*reply*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(textarea);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(44:0) {#if active}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let button;
    	let t1;
    	let if_block_anchor;
    	let dispose;
    	let if_block = /*active*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Reply !";
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(button, "class", "button");
    			toggle_class(button, "button-clear", !/*active*/ ctx[0]);
    			add_location(button, file$2, 40, 0, 959);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			dispose = listen_dev(button, "click", /*handleReplyClick*/ ctx[2], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*active*/ 1) {
    				toggle_class(button, "button-clear", !/*active*/ ctx[0]);
    			}

    			if (/*active*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $pages;
    	let $user;
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(4, $pages = $$value));
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(5, $user = $$value));
    	let active = false;
    	let reply = "";
    	const dispatch = createEventDispatcher();

    	const handleReplyClick = async () => {
    		if (active && !reply) {
    			//อยากให้ active เป็น true และ reply ไม่ว่าง ถ้าว่างจะส่งทำไม 5555
    			let res = await fetch(`http://localhost:1234/api/posts/${$pages.replace("PostID?id=", "")}/reply`, {
    				method: "POST",
    				body: JSON.stringify({ name: $user.username, reply }),
    				headers: { "content-type": "application/json" }
    			});

    			if (res.ok) {
    				dispatch("ReplySuccess");
    			}
    		} else {
    			$$invalidate(0, active = true);
    		}
    	};

    	const handleCancleClick = () => {
    		$$invalidate(0, active = false);
    		$$invalidate(1, reply = "");
    	};

    	function textarea_input_handler() {
    		reply = this.value;
    		$$invalidate(1, reply);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("reply" in $$props) $$invalidate(1, reply = $$props.reply);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    		if ("$user" in $$props) user.set($user = $$props.$user);
    	};

    	return [
    		active,
    		reply,
    		handleReplyClick,
    		handleCancleClick,
    		$pages,
    		$user,
    		dispatch,
    		textarea_input_handler
    	];
    }

    class ReplyForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ReplyForm",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\ReplyList.svelte generated by Svelte v3.18.1 */
    const file$3 = "src\\components\\ReplyList.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let t1;
    	let span;
    	let button;
    	let t3;
    	let hr;
    	let t4;
    	let p0;
    	let t5;
    	let t6;
    	let p1;
    	let t7;
    	let strong0;
    	let t8;
    	let t9;
    	let t10;
    	let h5;
    	let strong1;
    	let t12;
    	let current;
    	let dispose;
    	const replyform = new ReplyForm({ $$inline: true });
    	replyform.$on("ReplySuccess", /*onReplySuccess*/ ctx[4]);
    	const default_slot_template = /*$$slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text(/*topic*/ ctx[0]);
    			t1 = space();
    			span = element("span");
    			button = element("button");
    			button.textContent = "back";
    			t3 = space();
    			hr = element("hr");
    			t4 = space();
    			p0 = element("p");
    			t5 = text(/*content*/ ctx[2]);
    			t6 = space();
    			p1 = element("p");
    			t7 = text("Posted by ");
    			strong0 = element("strong");
    			t8 = text(/*name*/ ctx[1]);
    			t9 = space();
    			create_component(replyform.$$.fragment);
    			t10 = space();
    			h5 = element("h5");
    			strong1 = element("strong");
    			strong1.textContent = "Comment :";
    			t12 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", "button button-outline");
    			add_location(button, file$3, 28, 6, 592);
    			set_style(span, "float", "right");
    			add_location(span, file$3, 27, 4, 557);
    			add_location(h1, file$3, 25, 2, 534);
    			attr_dev(hr, "class", "svelte-1gm2clu");
    			add_location(hr, file$3, 31, 2, 691);
    			add_location(p0, file$3, 32, 2, 701);
    			add_location(strong0, file$3, 33, 15, 734);
    			add_location(p1, file$3, 33, 2, 721);
    			add_location(strong1, file$3, 35, 6, 818);
    			add_location(h5, file$3, 35, 2, 814);
    			attr_dev(div, "class", "container svelte-1gm2clu");
    			add_location(div, file$3, 24, 0, 507);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, span);
    			append_dev(span, button);
    			append_dev(div, t3);
    			append_dev(div, hr);
    			append_dev(div, t4);
    			append_dev(div, p0);
    			append_dev(p0, t5);
    			append_dev(div, t6);
    			append_dev(div, p1);
    			append_dev(p1, t7);
    			append_dev(p1, strong0);
    			append_dev(strong0, t8);
    			append_dev(div, t9);
    			mount_component(replyform, div, null);
    			append_dev(div, t10);
    			append_dev(div, h5);
    			append_dev(h5, strong1);
    			append_dev(div, t12);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    			dispose = listen_dev(button, "click", /*backToPage*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*topic*/ 1) set_data_dev(t0, /*topic*/ ctx[0]);
    			if (!current || dirty & /*content*/ 4) set_data_dev(t5, /*content*/ ctx[2]);
    			if (!current || dirty & /*name*/ 2) set_data_dev(t8, /*name*/ ctx[1]);

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 128) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[7], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(replyform.$$.fragment, local);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(replyform.$$.fragment, local);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(replyform);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $pages;
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(5, $pages = $$value));
    	let { topic } = $$props, { name } = $$props, { content } = $$props;

    	const backToPage = () => {
    		set_store_value(pages, $pages = "Posts");
    	};

    	const dispatch = createEventDispatcher();

    	const onReplySuccess = () => {
    		dispatch("ReplySuccess");
    	};

    	const writable_props = ["topic", "name", "content"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ReplyList> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("topic" in $$props) $$invalidate(0, topic = $$props.topic);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("content" in $$props) $$invalidate(2, content = $$props.content);
    		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { topic, name, content, $pages };
    	};

    	$$self.$inject_state = $$props => {
    		if ("topic" in $$props) $$invalidate(0, topic = $$props.topic);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("content" in $$props) $$invalidate(2, content = $$props.content);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    	};

    	return [
    		topic,
    		name,
    		content,
    		backToPage,
    		onReplySuccess,
    		$pages,
    		dispatch,
    		$$scope,
    		$$slots
    	];
    }

    class ReplyList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { topic: 0, name: 1, content: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ReplyList",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*topic*/ ctx[0] === undefined && !("topic" in props)) {
    			console.warn("<ReplyList> was created without expected prop 'topic'");
    		}

    		if (/*name*/ ctx[1] === undefined && !("name" in props)) {
    			console.warn("<ReplyList> was created without expected prop 'name'");
    		}

    		if (/*content*/ ctx[2] === undefined && !("content" in props)) {
    			console.warn("<ReplyList> was created without expected prop 'content'");
    		}
    	}

    	get topic() {
    		throw new Error("<ReplyList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set topic(value) {
    		throw new Error("<ReplyList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<ReplyList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<ReplyList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get content() {
    		throw new Error("<ReplyList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<ReplyList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\PostID.svelte generated by Svelte v3.18.1 */

    const { Error: Error_1 } = globals;
    const file$4 = "src\\pages\\PostID.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (30:2) {#if topic}
    function create_if_block$2(ctx) {
    	let title_value;
    	document.title = title_value = "Post: " + /*topic*/ ctx[0];
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(30:2) {#if topic}",
    		ctx
    	});

    	return block;
    }

    // (52:2) {:catch}
    function create_catch_block_1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Error";
    			add_location(div, file$4, 52, 4, 1325);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(52:2) {:catch}",
    		ctx
    	});

    	return block;
    }

    // (39:2) {:then post}
    function create_then_block(ctx) {
    	let await_block_anchor;
    	let promise_1;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*post*/ ctx[5], info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*promise*/ 2 && promise_1 !== (promise_1 = /*post*/ ctx[5]) && handle_promise(promise_1, info)) ; else {
    				const child_ctx = ctx.slice();
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(39:2) {:then post}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>    import { pages }
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>    import { pages }",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>    import { pages }
    function create_then_block_1(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(1:0) <script>    import { pages }",
    		ctx
    	});

    	return block;
    }

    // (41:17)         <ReplyList          topic={post.topic}
    function create_pending_block_1(ctx) {
    	let current;

    	const replylist = new ReplyList({
    			props: {
    				topic: /*post*/ ctx[5].topic,
    				name: /*post*/ ctx[5].name,
    				content: /*post*/ ctx[5].content,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	replylist.$on("ReplySuccess", /*onReply*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(replylist.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(replylist, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const replylist_changes = {};
    			if (dirty & /*promise*/ 2) replylist_changes.topic = /*post*/ ctx[5].topic;
    			if (dirty & /*promise*/ 2) replylist_changes.name = /*post*/ ctx[5].name;
    			if (dirty & /*promise*/ 2) replylist_changes.content = /*post*/ ctx[5].content;

    			if (dirty & /*$$scope, promise*/ 514) {
    				replylist_changes.$$scope = { dirty, ctx };
    			}

    			replylist.$set(replylist_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(replylist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(replylist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(replylist, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(41:17)         <ReplyList          topic={post.topic}",
    		ctx
    	});

    	return block;
    }

    // (47:8) {#each post.comment as ReplyListItem}
    function create_each_block(ctx) {
    	let current;

    	const replylistitem = new /*ReplyListItem*/ ctx[6]({
    			props: {
    				name: /*ReplyListItem*/ ctx[6].name,
    				reply: /*ReplyListItem*/ ctx[6].reply
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(replylistitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(replylistitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const replylistitem_changes = {};
    			if (dirty & /*promise*/ 2) replylistitem_changes.name = /*ReplyListItem*/ ctx[6].name;
    			if (dirty & /*promise*/ 2) replylistitem_changes.reply = /*ReplyListItem*/ ctx[6].reply;
    			replylistitem.$set(replylistitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(replylistitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(replylistitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(replylistitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(47:8) {#each post.comment as ReplyListItem}",
    		ctx
    	});

    	return block;
    }

    // (42:6) <ReplyList          topic={post.topic}          name={post.name}          content={post.content}          on:ReplySuccess={onReply}>
    function create_default_slot(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*post*/ ctx[5].comment;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 2) {
    				each_value = /*post*/ ctx[5].comment;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(42:6) <ReplyList          topic={post.topic}          name={post.name}          content={post.content}          on:ReplySuccess={onReply}>",
    		ctx
    	});

    	return block;
    }

    // (37:18)       <p>Fetching posts . . .</p>    {:then post}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Fetching posts . . .";
    			add_location(p, file$4, 37, 4, 866);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(37:18)       <p>Fetching posts . . .</p>    {:then post}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let t;
    	let section;
    	let promise_1;
    	let current;
    	let if_block = /*topic*/ ctx[0] && create_if_block$2(ctx);

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block_1,
    		value: 5,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			t = space();
    			section = element("section");
    			info.block.c();
    			add_location(section, file$4, 34, 0, 806);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(document.head, null);
    			append_dev(document.head, if_block_anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, section, anchor);
    			info.block.m(section, info.anchor = null);
    			info.mount = () => section;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (/*topic*/ ctx[0]) {
    				if (!if_block) {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			info.ctx = ctx;

    			if (dirty & /*promise*/ 2 && promise_1 !== (promise_1 = /*promise*/ ctx[1]) && handle_promise(promise_1, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[5] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			detach_dev(if_block_anchor);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(section);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $pages;
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(3, $pages = $$value));
    	let topic;

    	const fetchPostbyid = async () => {
    		let id = $pages.replace("PostID?id=", "");
    		let res = await fetch(`http://localhost:1234/api/posts/${id}`);
    		let data = await res.json();

    		if (res.ok) {
    			$$invalidate(0, topic = data.topic);
    			return data;
    		} else {
    			let err = await res.text();
    			throw new Error(err);
    		}
    	};

    	let onReply = () => {
    		$$invalidate(1, promise = fetchPostbyid());
    	};

    	let promise = fetchPostbyid();

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("topic" in $$props) $$invalidate(0, topic = $$props.topic);
    		if ("onReply" in $$props) $$invalidate(2, onReply = $$props.onReply);
    		if ("promise" in $$props) $$invalidate(1, promise = $$props.promise);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    	};

    	return [topic, promise, onReply];
    }

    class PostID extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PostID",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\PostForm.svelte generated by Svelte v3.18.1 */
    const file$5 = "src\\components\\PostForm.svelte";

    // (44:0) {#if active}
    function create_if_block$3(ctx) {
    	let button;
    	let t1;
    	let input;
    	let t2;
    	let textarea;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "cancle";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			textarea = element("textarea");
    			set_style(button, "float", "right");
    			attr_dev(button, "class", "button-outline");
    			add_location(button, file$5, 44, 2, 971);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "name", "Topic");
    			attr_dev(input, "placeholder", "Topic");
    			add_location(input, file$5, 50, 2, 1095);
    			attr_dev(textarea, "placeholder", "Content");
    			attr_dev(textarea, "class", "svelte-1rkipy4");
    			add_location(textarea, file$5, 51, 2, 1172);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*topic*/ ctx[1]);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*content*/ ctx[2]);

    			dispose = [
    				listen_dev(button, "click", /*handleCancleClick*/ ctx[4], false, false, false),
    				listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[8])
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*topic*/ 2 && input.value !== /*topic*/ ctx[1]) {
    				set_input_value(input, /*topic*/ ctx[1]);
    			}

    			if (dirty & /*content*/ 4) {
    				set_input_value(textarea, /*content*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(textarea);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(44:0) {#if active}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let button;
    	let t1;
    	let if_block_anchor;
    	let dispose;
    	let if_block = /*active*/ ctx[0] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Post !";
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(button, "class", "button");
    			toggle_class(button, "button-clear", !/*active*/ ctx[0]);
    			add_location(button, file$5, 39, 0, 803);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			dispose = listen_dev(button, "click", /*handlePostClick*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*active*/ 1) {
    				toggle_class(button, "button-clear", !/*active*/ ctx[0]);
    			}

    			if (/*active*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $user;
    	let $pages;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(5, $user = $$value));
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(6, $pages = $$value));
    	let active = false;
    	let topic = "";
    	let content = "";

    	const handlePostClick = () => {
    		if (active && topic && content) {
    			fetch("http://localhost:1234/api/posts/", {
    				method: "POST",
    				body: JSON.stringify({ name: $user.username, topic, content }),
    				headers: { "content-type": "application/json" }
    			}).then(res => res.text()).then(id => {
    				set_store_value(pages, $pages = `PostID?id=${id}`);
    			});
    		} else {
    			$$invalidate(0, active = true);
    		}
    	};

    	const handleCancleClick = () => {
    		$$invalidate(0, active = false);
    		$$invalidate(1, topic = "");
    		$$invalidate(2, content = "");
    	};

    	function input_input_handler() {
    		topic = this.value;
    		$$invalidate(1, topic);
    	}

    	function textarea_input_handler() {
    		content = this.value;
    		$$invalidate(2, content);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("topic" in $$props) $$invalidate(1, topic = $$props.topic);
    		if ("content" in $$props) $$invalidate(2, content = $$props.content);
    		if ("$user" in $$props) user.set($user = $$props.$user);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    	};

    	return [
    		active,
    		topic,
    		content,
    		handlePostClick,
    		handleCancleClick,
    		$user,
    		$pages,
    		input_input_handler,
    		textarea_input_handler
    	];
    }

    class PostForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PostForm",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\PostList.svelte generated by Svelte v3.18.1 */
    const file$6 = "src\\components\\PostList.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let span;
    	let button;
    	let t2;
    	let hr;
    	let t3;
    	let t4;
    	let current;
    	const postform = new PostForm({ $$inline: true });
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text("Posts List\r\n    ");
    			span = element("span");
    			button = element("button");
    			button.textContent = "Logout";
    			t2 = space();
    			hr = element("hr");
    			t3 = space();
    			create_component(postform.$$.fragment);
    			t4 = space();
    			if (default_slot) default_slot.c();
    			set_style(button, "float", "right");
    			attr_dev(button, "class", "button-outline");
    			add_location(button, file$6, 23, 6, 491);
    			add_location(span, file$6, 22, 4, 477);
    			add_location(h1, file$6, 20, 2, 451);
    			add_location(hr, file$6, 28, 2, 648);
    			attr_dev(div, "class", "container svelte-as1k3l");
    			add_location(div, file$6, 19, 0, 424);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			append_dev(h1, span);
    			append_dev(span, button);
    			append_dev(div, t2);
    			append_dev(div, hr);
    			append_dev(div, t3);
    			mount_component(postform, div, null);
    			append_dev(div, t4);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 16) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(postform.$$.fragment, local);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(postform.$$.fragment, local);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(postform);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $user;
    	let $pages;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(0, $user = $$value));
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(1, $pages = $$value));
    	const dispatch = createEventDispatcher();

    	const onLogout = () => {
    		set_store_value(user, $user = { username: "" });
    		set_store_value(pages, $pages = "Login");
    		dispatch("navigate", "right");
    	};

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$user" in $$props) user.set($user = $$props.$user);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    	};

    	return [$user, $pages, dispatch, onLogout, $$scope, $$slots];
    }

    class PostList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PostList",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\components\PostListItem.svelte generated by Svelte v3.18.1 */
    const file$7 = "src\\components\\PostListItem.svelte";

    function create_fragment$7(ctx) {
    	let div2;
    	let div0;
    	let h4;
    	let t0;
    	let t1;
    	let div1;
    	let p;
    	let t2;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			t0 = text(/*topic*/ ctx[1]);
    			t1 = space();
    			div1 = element("div");
    			p = element("p");
    			t2 = text(/*name*/ ctx[0]);
    			attr_dev(h4, "class", "svelte-1va8q4e");
    			add_location(h4, file$7, 28, 4, 664);
    			attr_dev(div0, "class", "row svelte-1va8q4e");
    			add_location(div0, file$7, 27, 2, 641);
    			add_location(p, file$7, 31, 4, 737);
    			attr_dev(div1, "class", "row svelte-1va8q4e");
    			add_location(div1, file$7, 30, 2, 714);
    			attr_dev(div2, "class", "container card svelte-1va8q4e");
    			add_location(div2, file$7, 26, 0, 609);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h4);
    			append_dev(h4, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t2);
    			dispose = listen_dev(h4, "click", /*gotoPost*/ ctx[2], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*topic*/ 2) set_data_dev(t0, /*topic*/ ctx[1]);
    			if (dirty & /*name*/ 1) set_data_dev(t2, /*name*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { id } = $$props, { name } = $$props, { topic } = $$props; // จะรับค่า props ต้องใส่อะไรหนิ
    	const dispatch = createEventDispatcher();

    	const gotoPost = () => {
    		// component ด้านบน on:gotoPost ได้
    		dispatch("gotoPost", id);
    	};

    	const writable_props = ["id", "name", "topic"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PostListItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(3, id = $$props.id);
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("topic" in $$props) $$invalidate(1, topic = $$props.topic);
    	};

    	$$self.$capture_state = () => {
    		return { id, name, topic };
    	};

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(3, id = $$props.id);
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("topic" in $$props) $$invalidate(1, topic = $$props.topic);
    	};

    	return [name, topic, gotoPost, id];
    }

    class PostListItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { id: 3, name: 0, topic: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PostListItem",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[3] === undefined && !("id" in props)) {
    			console.warn("<PostListItem> was created without expected prop 'id'");
    		}

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<PostListItem> was created without expected prop 'name'");
    		}

    		if (/*topic*/ ctx[1] === undefined && !("topic" in props)) {
    			console.warn("<PostListItem> was created without expected prop 'topic'");
    		}
    	}

    	get id() {
    		throw new Error("<PostListItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<PostListItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<PostListItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<PostListItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get topic() {
    		throw new Error("<PostListItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set topic(value) {
    		throw new Error("<PostListItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\Posts.svelte generated by Svelte v3.18.1 */

    const { Error: Error_1$1 } = globals;
    const file$8 = "src\\pages\\Posts.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (55:2) {:catch err}
    function create_catch_block$1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*err*/ ctx[8] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Error when fetch posts.");
    			t1 = text(t1_value);
    			attr_dev(p, "class", "error svelte-g4yf4q");
    			add_location(p, file$8, 55, 4, 1398);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$1.name,
    		type: "catch",
    		source: "(55:2) {:catch err}",
    		ctx
    	});

    	return block;
    }

    // (45:2) {:then posts}
    function create_then_block$1(ctx) {
    	let current;

    	const postlist = new PostList({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	postlist.$on("navigate", /*onNavigate*/ ctx[0]);

    	const block = {
    		c: function create() {
    			create_component(postlist.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(postlist, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const postlist_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				postlist_changes.$$scope = { dirty, ctx };
    			}

    			postlist.$set(postlist_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(postlist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(postlist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(postlist, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$1.name,
    		type: "then",
    		source: "(45:2) {:then posts}",
    		ctx
    	});

    	return block;
    }

    // (47:6) {#each posts as post}
    function create_each_block$1(ctx) {
    	let current;

    	const postlistitem = new PostListItem({
    			props: {
    				id: /*post*/ ctx[9].id,
    				name: /*post*/ ctx[9].name,
    				topic: /*post*/ ctx[9].topic
    			},
    			$$inline: true
    		});

    	postlistitem.$on("gotoPost", /*gotoPost*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(postlistitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(postlistitem, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(postlistitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(postlistitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(postlistitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(47:6) {#each posts as post}",
    		ctx
    	});

    	return block;
    }

    // (46:4) <PostList on:navigate={onNavigate}>
    function create_default_slot$1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*posts*/ ctx[7];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise, gotoPost*/ 6) {
    				each_value = /*posts*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(46:4) <PostList on:navigate={onNavigate}>",
    		ctx
    	});

    	return block;
    }

    // (43:18)       <!-- ระหว่างรอให้โชว์อะไรสักอย่าง -->    {:then posts}
    function create_pending_block$1(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$1.name,
    		type: "pending",
    		source: "(43:18)       <!-- ระหว่างรอให้โชว์อะไรสักอย่าง -->    {:then posts}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let t;
    	let section;
    	let promise_1;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block$1,
    		then: create_then_block$1,
    		catch: create_catch_block$1,
    		value: 7,
    		error: 8,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			t = space();
    			section = element("section");
    			info.block.c();
    			document.title = "Posts";
    			add_location(section, file$8, 41, 0, 1043);
    		},
    		l: function claim(nodes) {
    			throw new Error_1$1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, section, anchor);
    			info.block.m(section, info.anchor = null);
    			info.mount = () => section;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[7] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(section);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $user;
    	let $pages;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(3, $user = $$value));
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(4, $pages = $$value));
    	const dispatch = createEventDispatcher();

    	const onNavigate = ({ detail: dir }) => {
    		dispatch("navigate", dir);
    	};

    	let fetchdata = async () => {
    		if ($user) {
    			let res = await fetch("http://localhost:1234/api/posts");
    			let data = await res.json();

    			if (res.ok) {
    				return data;
    			} else {
    				let err = await res.text();
    				throw new Error(err);
    			}
    		}
    	};

    	let promise = fetchdata();

    	const gotoPost = ({ detail: id }) => {
    		set_store_value(pages, $pages = `PostID?id=${id}`);
    		console.log(id, $pages);
    		dispatch("navigate", "left");
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("fetchdata" in $$props) fetchdata = $$props.fetchdata;
    		if ("promise" in $$props) $$invalidate(1, promise = $$props.promise);
    		if ("$user" in $$props) user.set($user = $$props.$user);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    	};

    	return [onNavigate, promise, gotoPost];
    }

    class Posts extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Posts",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\pages\Register.svelte generated by Svelte v3.18.1 */
    const file$9 = "src\\pages\\Register.svelte";

    function create_fragment$9(ctx) {
    	let t0;
    	let section;
    	let div0;
    	let input0;
    	let t1;
    	let div1;
    	let input1;
    	let t2;
    	let p;
    	let t3;
    	let t4;
    	let button0;
    	let t6;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			t0 = space();
    			section = element("section");
    			div0 = element("div");
    			input0 = element("input");
    			t1 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t2 = space();
    			p = element("p");
    			t3 = text(/*err*/ ctx[2]);
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "Registor";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Back";
    			document.title = "Login to forum";
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "username");
    			attr_dev(input0, "class", "svelte-1ypwaqv");
    			add_location(input0, file$9, 51, 4, 1142);
    			add_location(div0, file$9, 49, 2, 1098);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "password");
    			attr_dev(input1, "class", "svelte-1ypwaqv");
    			add_location(input1, file$9, 55, 4, 1253);
    			add_location(div1, file$9, 53, 2, 1222);
    			set_style(p, "color", "red");
    			add_location(p, file$9, 57, 2, 1337);
    			attr_dev(button0, "class", "button button-outline");
    			add_location(button0, file$9, 58, 2, 1371);
    			attr_dev(button1, "class", "button button-clear");
    			add_location(button1, file$9, 59, 2, 1449);
    			attr_dev(section, "class", "container svelte-1ypwaqv");
    			add_location(section, file$9, 48, 0, 1067);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append_dev(section, t1);
    			append_dev(section, div1);
    			append_dev(div1, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(section, t2);
    			append_dev(section, p);
    			append_dev(p, t3);
    			append_dev(section, t4);
    			append_dev(section, button0);
    			append_dev(section, t6);
    			append_dev(section, button1);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[8]),
    				listen_dev(button0, "click", /*onLogin*/ ctx[3], false, false, false),
    				listen_dev(button1, "click", /*onCancle*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*username*/ 1 && input0.value !== /*username*/ ctx[0]) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}

    			if (dirty & /*err*/ 4) set_data_dev(t3, /*err*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $pages;
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(5, $pages = $$value));
    	let username = "";
    	let password = "";
    	let err = "";
    	const dispatch = createEventDispatcher();

    	const onLogin = async () => {
    		if (!(username && password)) {
    			$$invalidate(2, err = "plz check username and password");
    			return;
    		}

    		let res = await fetch("http://localhost:1234/api/user", {
    			method: "POST",
    			body: JSON.stringify({ username, password }),
    			headers: { "content-type": "application/json" }
    		});

    		let text = await res.text();

    		if (res.ok) {
    			set_store_value(pages, $pages = "Login");
    		} else {
    			$$invalidate(2, err = text);
    		}
    	};

    	const onCancle = () => {
    		set_store_value(pages, $pages = "Login");
    		dispatch("navigate", "right");
    	};

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    		if ("password" in $$props) $$invalidate(1, password = $$props.password);
    		if ("err" in $$props) $$invalidate(2, err = $$props.err);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    	};

    	return [
    		username,
    		password,
    		err,
    		onLogin,
    		onCancle,
    		$pages,
    		dispatch,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Register extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Register",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.18.1 */
    const file$a = "src\\App.svelte";

    // (37:38) 
    function create_if_block_3(ctx) {
    	let div;
    	let div_intro;
    	let div_outro;
    	let current;
    	const postid = new PostID({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(postid.$$.fragment);
    			set_style(div, "height", "100%");
    			add_location(div, file$a, 37, 4, 1141);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(postid, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(postid.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: 200, duration: 300 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(postid.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, fly, { x: 200, duration: 300 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(postid);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(37:38) ",
    		ctx
    	});

    	return block;
    }

    // (30:29) 
    function create_if_block_2(ctx) {
    	let div;
    	let div_intro;
    	let div_outro;
    	let current;
    	const register = new Register({ $$inline: true });
    	register.$on("navigate", /*onNavigate*/ ctx[2]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(register.$$.fragment);
    			set_style(div, "height", "100%");
    			add_location(div, file$a, 30, 4, 896);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(register, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(register.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: 200, duration: 300 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(register.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, {
    				x: /*dir*/ ctx[0] === "right" ? 200 : -200,
    				duration: 300
    			});

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(register);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(30:29) ",
    		ctx
    	});

    	return block;
    }

    // (23:31) 
    function create_if_block_1(ctx) {
    	let div;
    	let div_intro;
    	let div_outro;
    	let current;
    	const posts = new Posts({ $$inline: true });
    	posts.$on("navigate", /*onNavigate*/ ctx[2]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(posts.$$.fragment);
    			set_style(div, "height", "100%");
    			add_location(div, file$a, 23, 4, 662);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(posts, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(posts.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: 200, duration: 300 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(posts.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, {
    				x: /*dir*/ ctx[0] === "right" ? 200 : -200,
    				duration: 300
    			});

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(posts);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(23:31) ",
    		ctx
    	});

    	return block;
    }

    // (16:2) {#if $pages === 'Login'}
    function create_if_block$4(ctx) {
    	let div;
    	let div_intro;
    	let div_outro;
    	let current;
    	const login = new Login({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(login.$$.fragment);
    			set_style(div, "height", "100%");
    			add_location(div, file$a, 16, 4, 476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(login, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: 200, duration: 300 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, fly, { x: -200, duration: 300 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(login);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(16:2) {#if $pages === 'Login'}",
    		ctx
    	});

    	return block;
    }

    // (15:0) <Layout>
    function create_default_slot$2(ctx) {
    	let show_if;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$pages*/ ctx[1] === "Login") return 0;
    		if (/*$pages*/ ctx[1] === "Posts") return 1;
    		if (/*$pages*/ ctx[1] === "Reg") return 2;
    		if (dirty & /*$pages*/ 2) show_if = !!/*$pages*/ ctx[1].includes("PostID");
    		if (show_if) return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx, -1))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(15:0) <Layout>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let current;

    	const layout = new Layout({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(layout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(layout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const layout_changes = {};

    			if (dirty & /*$$scope, $pages*/ 10) {
    				layout_changes.$$scope = { dirty, ctx };
    			}

    			layout.$set(layout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(layout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(layout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(layout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $pages;
    	validate_store(pages, "pages");
    	component_subscribe($$self, pages, $$value => $$invalidate(1, $pages = $$value));
    	let dir = "";

    	const onNavigate = ({ detail: direction }) => {
    		$$invalidate(0, dir = direction);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("dir" in $$props) $$invalidate(0, dir = $$props.dir);
    		if ("$pages" in $$props) pages.set($pages = $$props.$pages);
    	};

    	return [dir, $pages, onNavigate];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
