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
this. now we can have rectangles of all orientations!

**possible rules of thumb**

- the positions of the stages must not move in such a way that causes the
wire to snap, but i think this is avoided by making it a 2 DOF cutter and
making it composed of two redundant linear stages.

