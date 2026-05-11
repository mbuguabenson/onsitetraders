import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';
import { observer } from 'mobx-react-lite';
import { LegacyLogout1pxIcon } from '@deriv/quill-icons/Legacy';

const Logout = observer(() => {
    const { client } = useStore();
    const handleLogout = useLogout();

    if (!client.is_logged_in) return null;

    return (
        <div 
            className='app-footer__item footer-logout' 
            onClick={handleLogout}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
            <LegacyLogout1pxIcon iconSize='xs' />
            <span className='footer-logout__text'>
                <Localize i18n_default_text='Logout' />
            </span>
        </div>
    );
});

export default Logout;
