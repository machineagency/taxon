# evaluation log

the purpose of this log is to do a microautoethnography of my efforts to
implement the six test machines.

## hot wire cutter

i thought about its construction, it seems that there are four actual stages
in a reference illustration that i have. i decided to have one redundant
linear block for the lower stages, and two separate linear blocks for each
upright stage.

the problem with this is that i have no idea how to handle the wire right now,
since the kinematic graph now has a cycle. the wire is different than other
tools in that it is not a rigid non-rotating tool like every other tool so
far. ideally, we would also rotate the wire---or perhaps we just remove a
degree of freedom and just say that the upperstages must be parallel... in
that case, it's just a 2 DOF wire cutter. okay, let's clarify that.

also the work envelope... if we only can move in the x and z directions,
it doesn't make sense to say that the work envelope is a box in this case.
but then also, i need to make a vertical 2d work envelope agh.

okay i went ahead and edited work envelope instantiation to account for
this. now we can have rectangles of all orientations! #equality

**possible rules of thumb**

- the positions of the stages must not move in such a way that causes the
wire to snap, but i think this is avoided by making it a 2 DOF cutter and
making it composed of two redundant linear stages.

## wasp clay 3D printer

this is the 2040 model, and they have a data sheet from their website, yay.
the first thing i notice is that they specify the work envelope (in their
words, "building volume") with a height and diameter... so looks like it's
time to support cylindrical work envelopes. i knew doing delta bot kinematics
was going to be a bit of a challenge, even though we are now working at the
block level so we're punting a bunch of the actual forward and inverse
kinematics calculations. however, there several forms of delta bot kinematics,
even, one with revolute joints and one ... with different ones? i need to look
into the kind that the wasp printer has a bit more deeply.

i have to implement a new class to handle a non-moving platform. actually no,
i'll just have current platforms be allowed to be non-actuating.

**rules of thumb**

- not super innovative, but the way we do bounds checking for work envelopes
that are defined cylindrically is different than with cuboid work envelopes,
and bounds checking for work envelopes needs to be implemented as a rule
of thumb anyway. this makes me think, is the rule of thumb for work envelope
checking "polymorphic" over different types (shapes) of work envelopes?

# liteplacer open source diy smd pick and place machine

wow have i opened a can of worms with this one. first, the specific design
that i will be using is the liteplacer by juha kuusama, which is an open
source hardware design that uses another open source software control system
for pick and place machines called openpnp. the machine itself is way cooler
and more complicated than i originally suspected when i was browing the internet
looking for any pick and place machine to add to my slides for my quals talk.

namely, one thing to note is that the tool assembly is pretty complex, and
supports tool-changing for pick and place tips. when it comes to the sizes
of things it can pick up, the creater talks about different classes of smd
parts like 0402, 0603, sot-23, and soic-8. i assume all of these are different
profiles of smd footprints and of course nadya is going to be mad at me that
i don't know this sort of thing already and that i am not a #realmaker, but
alas, i will once again solve this sort of problem by codifying it in the
action language! let the programmer deal with it, make a rule of thumb based
on tool selection and different type of smd footprint... ooh, i'm good, i'm
going to add this below right now.

finally, the actual tool assembly is pretty complicated and includes a
precision offset camera with light, alongside the actual up and down actuating
assembly, which actually has two drive assemblies: a lead screw for moving
the entire assembly up and down off of the crossbar, and a timing belt
for quick moves up and down with the tool tip.

yet another issues that the pick and place machine raises (no pun intended)
is the notion of a work envelope when raising the tool. this is actually a
similar issue that i dodged for the axidraw. the work envelope should be a
2d rectangle, but if we are moving the tool up and down, this is actually
a box, or if we try really hard, two 2d planes—although even this is difficult
to model because we need to know exactly the distance between the two planes
and would have to raise an "out of envelope" issue if we were even slightly
off height-wise. pragmatically, for now, we just project the y-coordinate
onto the plane and just check the x and z bounds, but it'd be nice to formalize
this in some way.

**rules of thumb**

- certain footprints of pcbs can only be picked up with certain tools
- work envelope checking with a 2dof tool that can be raised and lowered (this
includes the axidraw) needs to be handled in a special way (e.g. projecting
to the planar work envelope).
- camera routine somehow---the routine seems to just fire at the beginning
when the camera checks the pcb for fiducials to localize/zero its subsequent
movement commands.
