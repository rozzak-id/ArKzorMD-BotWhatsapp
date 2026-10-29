import { render } from 'preact';
import { App } from './app';
import './styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('Elemen #app tidak ditemukan.');

render(<App />, root);
