# Overview

i would like to create an SSG webapp that lets users input a team of 4 pokemon through a simple page. the purpose of this page is to be a calculator that produces an output team that should be effective against the input team. there will also be some further features i will expand upon.

when a box is clicked, a dropdown is quickly loaded that presents a list of pokemon. this list of pokemon is derived from the code in fetch_typings.py. this list almost never needs updating (it only needs to be updated when a new pokemon game is release), so we will only update it when this webapp is built.

to keep costs low, at least in the beginning, were going to have this repo build & deploy once a day using github actions. the deployment target will actually be another github pages repo, so that this pipeline is free at least for now.

The title of this app is Meta-Gross, a play on words because its purpose is to help people pick teams of pokemon to play online that wall the commonly picked pokemon in the meta; ie it's for people who think the meta is gross ("metagross" is a pokemon too).

# Features

## The Main Page / Team Calculator
at the top of the page, there will be a dropdown that defines which subset of pokemon are available for selection, and will act as a filter against the whole database of pokemon, that database being the json object returned from fetch_typings.py.

for now there will only be 2 dropdown keys, and each key maps to a value that is a list of strings. this list of strings filters the available pokemon, by name, in the json db.

the two keys
- Pokemon Champions (populated from champions-data/champions-clean-lower)
- All Pokemon (no filter)

now the main part: there will be 4 rectangles (pokemon slots) on the right of the screen laid out vertically. when a user clicks on any of them, a dropdown will appear that lets them select a pokemon (technically, theyre selecting an object from the db). upon selecting, they will be routed to the next empty slot (maybe a linkedlist - whatever you think). when there are no empty slots, run the output function that i will describe next.

now on the left of the screen, there will be another similarly styled sequence of rectangles, that represent an output team. the reason input is on the right and ouput is on the left, is that in pokemon champions, when youre about to battle someone, your team is on the left and the opposing team is on the right.

this output team is a team that is calculated to have type advantages over the input team. there will be a few strategies (in the OOP design pattern sense of the word) for this calculation. the first and default will be maximize type advantages.

the code for this strategy already exists in research.ipynb, under the "Single Function" md header 1 cell. note that the code currently returns multiple output teams given an input team, and that there is a randomizer function that finally selects an exact team. i want randomize to be a button that shuffles the user's output team until they're happy.

the randomizer function also returns a count of advantages the output team has against the input team, so be sure to present that as well.

i also want the user to be able to click the output cells, similarly to the input, and select other pokemon in a dropdown. the difference in this dropdown, is that is going to contain only pokemon with the same type as the pokemon selected.

the next strategy also exists in the notebook, but dont worry about implementing that one, just provide it as another strategy subclass and ill fill it in.

that is all for now.

## Project Details
Let's use the nextjs as an SSG and tailwind css for styling.

Again the pokemon database is done at build time using the code from fetch_typings.py. reuse helpers.py and poketypings.py where needed (convert files to js whenever).

i want to have the code exist in the ./app directory. if you need to the helper scripts i just mentioned, move them, but make sure to update research.ipynb to correctly import them.