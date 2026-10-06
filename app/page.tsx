import CatalogClient, {type RemoteCatalogApp} from './catalog-client';
import snapshot from './catalog-snapshot.json';
export default function Home(){return <CatalogClient snapshot={snapshot as RemoteCatalogApp[]}/>;}
