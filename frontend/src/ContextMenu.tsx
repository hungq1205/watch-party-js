import React, { useEffect, useContext } from "react";
import { GlobalPopupContext } from "./App";
import "./ContextMenu.css";

export interface ContextMenuProps {
    isOpen: boolean;
    left: number;
    top: number;
    items: ContextMenuItemProps[];
};

export interface ContextMenuItemProps {
    name: string;
    onSelect: () => void;
};

let unfocusTimer: number | undefined = undefined;

const ContextMenuItem: React.FC<ContextMenuItemProps> = ({name, onSelect}) => {
    return <li onClick={ onSelect }>{name}</li>;
};

const ContextMenu: React.FC<ContextMenuProps> = ({isOpen, left, top, items}) => {
    const setContextMenuState = useContext(GlobalPopupContext)?.setContextMenuState;
    const contextMenuRef = React.useRef<HTMLUListElement | null>(null);
    const style = { left: `${left - 1}px`, top: `${top - 1}px` };

    useEffect(() => {
        if (!contextMenuRef.current || !setContextMenuState)
            return;
        isOpen ? contextMenuRef.current.classList.remove("d-none") : contextMenuRef.current.classList.add("d-none");
        contextMenuRef.current.onpointerleave = () => unfocusTimer = setTimeout(() => setContextMenuState({isOpen: false} as ContextMenuProps), 300);
        contextMenuRef.current.onpointerenter = () => unfocusTimer && clearTimeout(unfocusTimer) && (unfocusTimer = undefined);
    });

    return ( 
        <ul className="context-menu" ref={contextMenuRef} style={style}>
            {isOpen && items.map((item) => (
                <ContextMenuItem 
                    key={item.name} 
                    name={item.name} 
                    onSelect={() => {
                        if (!setContextMenuState)
                            return;
                        item.onSelect();
                        setContextMenuState({isOpen: false} as ContextMenuProps);
                    }}
                />
            ))}
        </ul>
    );
};

export default ContextMenu;