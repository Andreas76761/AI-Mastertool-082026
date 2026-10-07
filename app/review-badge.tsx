import {reviewLight,type AppReview} from './app-review';
import type {AppAnalysis} from './app-evolution';
export default function ReviewBadge({app}:{app:{review?:AppReview;analysis?:AppAnalysis}}){const light=reviewLight(app);return <span className={'review-light '+light.color}><i aria-hidden="true"/>{light.label}</span>;}
