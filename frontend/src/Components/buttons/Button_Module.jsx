import styles from './Button_Module.module.css';
import { ThemeContext } from '../../Context/ThemeContext';
import { useContext } from 'react';
const Button_Module = ({
    click,
    label, 
    icon,
    disabled,
    styles_color}) => {
    /*
        styles_color: "red", "blue", "green", "yellow", "theme"
        onClick: function to handle button click
        label: text to display on the button
        icon: icon to display on the button (optional)
        disabled: boolean to disable the button
    */
    const { theme, toggleTheme } = useContext(ThemeContext);
    
    if (styles_color === 'theme') {
        return (
            <div className={styles.buttonContainer}>
                <button 
                    onClick={toggleTheme}
                    className={styles.theme}
                    disabled={disabled}
                >
                    {theme && <span className="button-label">{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>}
                </button>
            </div>
        );
    }



    const buttonStyles = () => {
        switch (styles_color) {
            case 'red':
                return styles.red;
            case 'blue':
                return styles.blue;
            case 'green':
                return styles.green;
            case 'yellow':
                return styles.yellow;
            case 'theme':
                return styles.theme;
            default:
                return styles.default;
        }
    };
    return (
        <div className={styles.buttonContainer}>
            <button 
                onClick={() => {
                    click && click();
                    }}
                className={`${buttonStyles()}`}
                disabled={disabled}
            >
                {icon && <span className={styles.icon}>{icon}</span>}
                {label && <span className="button-label">{label}</span>}
            </button>
        </div>
    );
};

export default Button_Module;