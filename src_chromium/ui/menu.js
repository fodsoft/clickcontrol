// ui/menu.js - ClickControl(TM) v1.0

import { aplicarTraduccion } from "./lang.js";
import { Config } from '../utils/config.js';

document.addEventListener('DOMContentLoaded', async () =>
{
    aplicarTraduccion();
    const config = await Config.obtenerConfig();
    const toggleActivar = document.getElementById('toggle-activar');
    const toggleTodosSitios = document.getElementById('toggle-todos-sitios');
    const toggleProtectMax = document.getElementById('toggle-protect-max');
    const inputSitio = document.getElementById('input-sitio');
    const btnAgregar = document.getElementById('btn-agregar');
    const listaSitios = document.getElementById('lista-sitios');

    toggleActivar.checked = config.enable;
    toggleTodosSitios.checked = config.allSites;
    toggleProtectMax.checked = config.maxProtect;
    renderizarLista(config.sitesList);
    toggleActivar.addEventListener('change', () => actualizarConfig('enable', toggleActivar.checked));
    toggleTodosSitios.addEventListener('change', () => actualizarConfig('allSites', toggleTodosSitios.checked));
    toggleProtectMax.addEventListener('change', () => actualizarConfig('maxProtect', toggleProtectMax.checked));

    btnAgregar.addEventListener('click', () => 
    {
        let val = inputSitio.value.trim().toLowerCase();
        val = val.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        if (val && !config.sitesList.includes(val)) 
        {
            config.sitesList.push(val);
            actualizarConfig('sitesList', config.sitesList);
            renderizarLista(config.sitesList);
            inputSitio.value = '';
        }
    });

    async function actualizarConfig(key, val) 
    {
        config[key] = val;
        await (Config.guardarConfig(config));
    }

    function renderizarLista(lista) 
    {
        listaSitios.innerHTML = '';
        lista.forEach((dominio, indice) => {
            const li = document.createElement('li');
            li.textContent = dominio;
            const del = document.createElement('span');
            del.textContent = '✖';
            del.className = 'btn-quitar';
            del.title = "Eliminar";
            del.onclick = () => 
            {
                config.sitesList.splice(indice, 1);
                actualizarConfig('sitesList', config.sitesList);
                renderizarLista(config.sitesList);
            };
            li.appendChild(del);
            listaSitios.appendChild(li);
        });
    }
});
// FODSOFT(TM). Neo Fodere de Frutos. All rights reserved.