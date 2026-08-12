# US County Elimination Wheel Map

## Overview

This repository holds the files for a web app made for the Instagram series US County Elimination Wheel, hosted by Camphost (@us_count_elimination_wheel, @camphost_ on Instagram).

The app features an interactive map of 3232 county and county equivalent areas in and around the United Stated (See Contents section)
It also features an editor that exports elimination data in the form of a JSON file so that as counties are eliminated, they can be crossed off on the map.
The editor allows the day and date of the elimination to be entered, as well as any additional notes associated with the elimination.

The map page is hosted using GitHub pages and can be found at: https://kevinocon922.github.io/USCountyEliminationWheelMap/

## Contents

The map is a modified version of counties-albers-10m.json created by bratter (https://github.com/bratter/us-atlas).
It contains 3144 US county equivalents, including DC.
It replaces the now abolished 8 Connecticut Counties with the 9 Planning Regions, formally established in 2024.
It also includes US territories: The 78 municipalities of Puerto Rico, Guam, the US Virgin Islands, The American Samoa Islands, The Northern Mariana Islands

Clicking on the map reveals a side panel with information about each county, such as the date of its elimination (if applicable) and any additional notes.

## Implementation

This web app uses the TopoJson Client and D3 JS libraries to render the map (found under assets) which is in TopoJson format.
The modifications to Connecticut were done using mapshaper.org.
