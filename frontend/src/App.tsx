import React, { createContext, useState } from 'react';
import Lobby from './Lobby.tsx';
import Login from './Login.tsx';
import SideMenu from './SideMenu.tsx';
import Modal, { ModalProps } from './Modal.tsx';
import ContextMenu, { ContextMenuProps } from './ContextMenu.tsx';
import './App.css';
import MovieBox from './MovieBox.tsx';
import { Route, Routes } from 'react-router-dom';
import UserContextNode from './UserContextNode.tsx';

export interface PopupContext {
	modalState: ModalProps
    setModalState: React.Dispatch<React.SetStateAction<ModalProps>>
    setContextMenuState: React.Dispatch<React.SetStateAction<ContextMenuProps>>
}

export const GlobalPopupContext = createContext<PopupContext | null>(null);

function App() {
	const [modalState, setModalState] = useState<ModalProps>({isOpen: false} as ModalProps);
	const [ctxMenuState, setContextMenuState] = useState<ContextMenuProps>({isOpen: false} as ContextMenuProps);

	return (
		<>
		<UserContextNode>
			<GlobalPopupContext.Provider value={{ modalState, setModalState, setContextMenuState }}>
				<Modal {...modalState} />
				<ContextMenu {...ctxMenuState} />

				<Routes>
					<Route path="*" element={<Login />} />
					<Route element={<SideMenu />}>
						<Route path="/lobby" element={<Lobby />} />
						<Route path="/box" element={<MovieBox />} />
					</Route>
				</Routes>

			</GlobalPopupContext.Provider>
		</UserContextNode>
		</>
	);
}

export default App;