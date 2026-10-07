import "../App.css"
import { Link } from 'react-router-dom'
export default function LandingPage() {
    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <span className="brandMark">H</span>
                    <h2>HandShake</h2>
                </div>
                <div className='navlist'>
                    <Link to="/aljk23">Join as guest</Link>
                    <Link to="/auth">Register</Link>
                    <Link className="navLogin" to="/auth">Log in</Link>
                </div>
            </nav>

            <main className="landingMainContainer">
                <div className="landingCopy">
                    <p className="eyebrow">HandShake video calls</p>
                    <h1>Talk face to face.</h1>
                    <p className="landingLead">Start a call or join one with a meeting code.</p>
                    <div className="landingActions">
                        <Link className="primaryLink" to="/auth">Sign in</Link>
                        <Link className="secondaryLink" to="/aljk23">Join as guest</Link>
                    </div>
                </div>
            </main>
        </div>
    )
}