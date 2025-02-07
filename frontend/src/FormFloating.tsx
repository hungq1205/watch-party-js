import "./FormFloating.css";

export interface FormFloatingProps {
    type?: string;
    name: string;
    displayName: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FormFloating: React.FC<FormFloatingProps> = ({ type, name, displayName, onChange }) => (
    <div className="form-floating">
        <input
            type={ type ? type : "text" }
            name={name}
            id={name}
            onChange={onChange}
            placeholder={displayName}

            className="form-control"
            autoComplete="off"
            autoCorrect="off"
        />
        <label htmlFor={name}>{displayName}</label>
    </div>
);

export default FormFloating;