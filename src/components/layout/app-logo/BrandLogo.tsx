import React from 'react';

type TBrandLogoProps = {
    width?: number | string;
    height?: number | string;
    fill?: string;
    className?: string;
};

/**
 * BrandLogo — Profithub brand SVG mark used in the mobile menu header.
 * Compatible with the trading-bot-template header API.
 */
export const BrandLogo = ({ width = 100, height = 28, fill = 'currentColor', className }: TBrandLogoProps) => {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox='0 0 200 56'
            xmlns='http://www.w3.org/2000/svg'
            aria-label='Profithub Traders'
        >
            {/* P glyph accent */}
            <rect x='0' y='8' width='6' height='40' rx='3' fill='#00D4AA' />
            <rect x='6' y='8' width='24' height='6' rx='3' fill='#00D4AA' />
            <rect x='6' y='27' width='24' height='6' rx='3' fill='#00D4AA' />
            <rect x='30' y='8' width='6' height='25' rx='3' fill='#00D4AA' />

            {/* ROFITHUB text */}
            <text
                x='44'
                y='36'
                fontFamily='"Inter", "Segoe UI", Arial, sans-serif'
                fontWeight='800'
                fontSize='28'
                letterSpacing='2'
                fill={fill}
            >
                ROFITHUB
            </text>

            {/* TRADERS sub-label */}
            <text
                x='44'
                y='52'
                fontFamily='"Inter", "Segoe UI", Arial, sans-serif'
                fontWeight='400'
                fontSize='11'
                letterSpacing='4'
                fill={fill}
                opacity='0.6'
            >
                TRADERS
            </text>
        </svg>
    );
};

export default BrandLogo;
