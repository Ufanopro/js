const OPENCAGE_API_KEY = '5374a333d8f84f79ba8896caf46f609d';
const ORS_API_KEY = '5b3ce3597851110001cf6248cfc538b7dca543a38f37258b5af5fd7c';

const preciosDesplazamiento = {
    '46591': 10.35, '46594': 10.35, '46593': 10.35, '46148': 10.35,
    '46514': 5.65, '46511': 5.65, '46529': 4.70, '46590': 6.75,
    '46512': 5.65, '46149': 5.65, '46592': 5.65, '46515': 5.65,
    '46510': 5.65, '46500': 4.70, '46520': 4.70, '46595': 6.75,
    '46540': 6.75, '46530': 6.75
};

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('miFormulario').addEventListener('submit', async function (event) {
        event.preventDefault();

        const origen = document.getElementById('origen').value;
        const destino = document.getElementById('destino').value;
        const festivo = document.getElementById('festivo').checked;
        const interurbano = document.getElementById('interurbano').checked;
        const desplazamiento = document.getElementById('desplazamiento').checked;

        try {
            const origenData = await getCoordinates(origen);
            const destinoData = await getCoordinates(destino);

            if (origenData && destinoData) {
                document.getElementById('coordsOrigen').innerText = `📍 Lat: ${origenData.geometry.lat}, Lng: ${origenData.geometry.lng} | CP: ${origenData.codigoPostal}`;
                document.getElementById('coordsDestino').innerText = `📍 Lat: ${destinoData.geometry.lat}, Lng: ${destinoData.geometry.lng} | CP: ${destinoData.codigoPostal}`;

                const distancia = await calcularDistancia(origenData.geometry, destinoData.geometry);

                if (distancia) {
                    const importe = calcularTarifa(
                        distancia,
                        festivo,
                        interurbano,
                        desplazamiento,
                        origenData.codigoPostal
                    );

                    let mensaje = `📏 Distancia: ${distancia} km\n`;
                    if (festivo) mensaje += `🏖️ Festivo\n`;
                    if (interurbano) mensaje += `🚗 Interurbano\n`;
                    if (desplazamiento) mensaje += `🚶‍♂️ Desplazamiento (CP Origen: ${origenData.codigoPostal})\n`;

                    mensaje += `💰 Bajada de bandera: `;
                    
                    if (desplazamiento && preciosDesplazamiento[origenData.codigoPostal]) {
                        mensaje += `${importe.bajadaBandera.toFixed(2)} € (Desplazamiento desde CP ${origenData.codigoPostal})`;
                    } else {
                        mensaje += `${importe.bajadaBandera.toFixed(2)} € ${festivo ? '(Festivo)' : ''}`;
                    }

                    mensaje += `\n💵 Total: ${importe.total.toFixed(2)} €`;
                    alert(mensaje);
                } else {
                    alert('No se pudo calcular la distancia.');
                }
            } else {
                alert('No se encontraron coordenadas para una de las direcciones.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la solicitud');
        }
    });
});

async function getCoordinates(direccion) {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(direccion)}&key=${OPENCAGE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results.length > 0) {
            const result = data.results[0];
            return {
                geometry: result.geometry,
                codigoPostal: result.components.postcode || ''
            };
        }
        return null;
    } catch (error) {
        console.error('Error obteniendo coordenadas:', error);
        return null;
    }
}

async function calcularDistancia(origen, destino) {
    const url = 'https://api.openrouteservice.org/v2/matrix/driving-car';
    const body = {
        locations: [
            [origen.lng, origen.lat],
            [destino.lng, destino.lat]
        ],
        metrics: ['distance']
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ORS_API_KEY
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (data.distances && data.distances[0] && data.distances[0][1]) {
            return (data.distances[0][1] / 1000).toFixed(2);
        }
        return null;
    } catch (error) {
        console.error('Error calculando distancia:', error);
        return null;
    }
}

function calcularTarifa(distancia, esFestivo, esInterurbano, esDesplazamiento, codigoPostalOrigen) {
    let bajadaBandera;
    let precioPorKm = 1.12; // Valor por defecto

    if (esDesplazamiento && preciosDesplazamiento[codigoPostalOrigen]) {
        bajadaBandera = preciosDesplazamiento[codigoPostalOrigen];
        precioPorKm = 1.12;
    } else if (esInterurbano) {
        bajadaBandera = esFestivo ? 2.70 : 2.00;
        precioPorKm = 1.34;
    } else {
        bajadaBandera = esFestivo ? 2.70 : 2.00;
        precioPorKm = esFestivo ? 1.34 : 1.12;
    }

    return {
        bajadaBandera: bajadaBandera,
        total: bajadaBandera + (distancia * precioPorKm)
    };
}
