import { useContext, useEffect, useRef } from 'react';

import './Modal.css';
import { GlobalPopupContext } from './App';

export interface ModalProps {
    isOpen: boolean;
    title: string;
    fields: string[];
    onSubmit: (evt: React.FormEvent<HTMLFormElement>, data: Record<string, string>) => void;
}

const Modal: React.FC<ModalProps> = ({isOpen, title, fields, onSubmit}) => {
    const setModalState = useContext(GlobalPopupContext)?.setModalState;
    const formData = useRef<Record<string, string>>({});
    const modalRef = useRef<HTMLDialogElement | null>(null);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        formData.current[event.target.name] = event.target.value;
    };

    useEffect(() => {
        if (!modalRef.current || !setModalState)
            return;

        isOpen ? modalRef.current.showModal() : modalRef.current.close();
        modalRef.current.onclick = e => {
            if (e.button !== 0 || !modalRef.current)
                return;

            const dialogBound = modalRef.current.getBoundingClientRect();
            if (e.clientX < dialogBound.left || 
                e.clientX > dialogBound.right || 
                e.clientY < dialogBound.top || 
                e.clientY > dialogBound.bottom
            )
                setModalState({ isOpen: false } as ModalProps);
        }
    });

    return (
        <dialog ref={modalRef}>
            <form autoComplete="off" onSubmit={ e => { onSubmit(e, formData.current); formData.current = {} } }>
                <h2>{title}</h2>
                {fields?.map((field, index) => (
                    <input 
                        key={field} 
                        name={field} 
                        placeholder={field} 
                        autoComplete="false"
                        autoFocus={index === 0}
                        onChange={handleInputChange}
                    />
                ))}
                <input type="button" hidden />
            </form>
        </dialog>
    );
};

export default Modal;