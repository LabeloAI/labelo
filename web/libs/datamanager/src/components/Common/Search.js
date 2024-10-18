import { inject, observer } from "mobx-react";
import { Button } from "./Button/Button";
import Input from "./Input/Input";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useRef, useState, useEffect } from "react";

const searchInjector = inject(({ store }) => {
    const { project } = store;
    return { projectId: project.id, store };
});

export const Search = searchInjector(observer(({ size, projectId, store }) => {
    const [inputValue, setInputValue] = useState('');
    let ref = useRef();

    // useEffect(() => {
    //     console.log('store', store);
    // }, [store]);

    if (!store.project.search_method || !store.project.description_ml_model) {
        return null; 
    }

    const onClick = () => {
        if (inputValue.length > 2) {
            let viewId = store.viewsStore.selected.id;
            store.dataStore.fetch({
                id: viewId,
                project: projectId,
                search: inputValue,
                reload: true,
            });
        }
    };

    const onKeyDown = (ev) => {
        if (ev.keyCode === 13) {
            onClick();
        }
    };

    const onClear = () => {
        setInputValue('');
        ref.current.focus();
    };

    const onChange = (e) => {
        setInputValue(e.target.value);
    };

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <Input
                size={size}
                className="is-search"
                ref={ref}
                onKeyDown={onKeyDown}
                placeholder="Image search"
                value={inputValue}
                onChange={onChange}
            />
            {inputValue && (
                <Button
                    size={size}
                    onClick={onClear}
                    style={{ marginLeft: 8 }}
                >
                    <FaTimes />
                </Button>
            )}
            <Button size={size} onClick={onClick} style={{ marginLeft: 8 }}>
                <FaSearch />
            </Button>
        </div>
    );
}));
